import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsQueryDto, ProductSortBy, SortOrder } from './dto/get-products-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllCategories() {
    return this.prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm có ID: ${id}`);
    }

    return product;
  }

  async findBySku(sku: string) {
    const product = await this.prisma.product.findUnique({
      where: { sku: sku.toUpperCase().trim() },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

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

    return this.prisma.product.create({
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
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id);

    return this.prisma.product.update({
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
  }

  async updateStock(id: string, newStock: number) {
    await this.findById(id);

    return this.prisma.product.update({
      where: { id },
      data: { stock: newStock },
    });
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
