import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsQueryDto, ProductSortBy, SortOrder } from './dto/get-products-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(query: GetProductsQueryDto) {
    const {
      search,
      categoryId,
      brand,
      minPrice,
      maxPrice,
      page = 1,
      limit = 12,
      sortBy = ProductSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = query;

    // F04 Cache Key based on query parameters
    const cacheKey = `products:list:${JSON.stringify({ search, categoryId, brand, minPrice, maxPrice, page, limit, sortBy, sortOrder })}`;

    // 1. Try fetching from Redis Cache (Target: < 20ms)
    const cachedData = await this.redis.get<{ items: any[]; meta: any }>(cacheKey);
    if (cachedData) {
      return {
        ...cachedData,
        _cached: true,
      };
    }

    // 2. Cache Miss or Redis Unavailable -> Query Database
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (brand) {
      where.brand = { equals: brand, mode: 'insensitive' };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    const result = {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // 3. Store in Redis Cache (TTL: 5 minutes)
    await this.redis.set(cacheKey, result, 300);

    return result;
  }

  async findAllCategories() {
    const cacheKey = 'products:categories';
    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    await this.redis.set(cacheKey, categories, 600); // 10 minutes TTL
    return categories;
  }

  async findById(id: string) {
    const cacheKey = `products:detail:${id}`;

    // 1. Try cache
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) {
      if (cached._notFound) {
        // Cache Penetration Protection: Do not re-query non-existent keys
        throw new NotFoundException(`Không tìm thấy sản phẩm có ID: ${id}`);
      }
      return cached;
    }

    // 2. Query DB
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!product) {
      // F04 Cache Penetration: Cache empty state for 30s
      await this.redis.set(cacheKey, { _notFound: true }, 30);
      throw new NotFoundException(`Không tìm thấy sản phẩm có ID: ${id}`);
    }

    // Cache product detail for 10 minutes
    await this.redis.set(cacheKey, product, 600);
    return product;
  }

  async findBySku(sku: string) {
    const formattedSku = sku.toUpperCase().trim();
    const cacheKey = `products:sku:${formattedSku}`;

    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { sku: formattedSku },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (product) {
      await this.redis.set(cacheKey, product, 600);
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { sku: dto.sku.toUpperCase().trim() },
    });

    if (existing) {
      throw new ConflictException(`Mã SKU "${dto.sku}" đã tồn tại trên hệ thống.`);
    }

    const slug = this.generateSlug(dto.name) + '-' + Date.now().toString(36);

    const created = await this.prisma.product.create({
      data: {
        sku: dto.sku.toUpperCase().trim(),
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim(),
        price: dto.price,
        stock: dto.stock,
        brand: dto.brand?.trim(),
        imageUrl: dto.imageUrl?.trim(),
        categoryId: dto.categoryId,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        category: true,
      },
    });

    // Invalidate list caches
    await this.invalidateProductCaches();

    return created;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id);

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        price: dto.price,
        stock: dto.stock,
        brand: dto.brand?.trim(),
        imageUrl: dto.imageUrl?.trim(),
        categoryId: dto.categoryId,
        isActive: dto.isActive,
      },
      include: {
        category: true,
      },
    });

    // F04 Cache Invalidation: When price or stock updates, immediately clear related caches
    await this.invalidateProductCaches(id, updated.sku);

    return updated;
  }

  async updateStock(id: string, newStock: number) {
    const product = await this.findById(id);

    const updated = await this.prisma.product.update({
      where: { id },
      data: { stock: newStock },
    });

    // F04 Invalidate immediately
    await this.invalidateProductCaches(id, product.sku);

    return updated;
  }

  /**
   * F04 Invalidate all related product cache keys
   */
  async invalidateProductCaches(productId?: string, sku?: string) {
    await Promise.all([
      this.redis.delByPattern('products:list:*'),
      this.redis.del('products:categories'),
      productId ? this.redis.del(`products:detail:${productId}`) : Promise.resolve(),
      sku ? this.redis.del(`products:sku:${sku.toUpperCase().trim()}`) : Promise.resolve(),
    ]);
    this.logger.log(`🧹 Product cache invalidated: ${productId || 'all'}`);
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
