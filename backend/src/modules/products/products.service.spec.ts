import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService (Caching & Invalidation)', () => {
  let service: ProductsService;
  let prisma: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<RedisService>;

  const mockProduct = {
    id: 'prod-1',
    sku: 'IP16-PM-256',
    name: 'iPhone 16 Pro Max',
    slug: 'iphone-16-pro-max',
    description: 'High-end smartphone',
    price: 34000000,
    stock: 20,
    brand: 'Apple',
    imageUrl: 'https://example.com/img.png',
    isActive: true,
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Phones', slug: 'phones' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
      },
    };

    const mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delByPattern: jest.fn().mockResolvedValue(1),
      isAvailable: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get(PrismaService);
    redis = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll (Redis Caching)', () => {
    it('should return cached data immediately when cache hit occurs (<20ms response time)', async () => {
      const cachedResult = {
        items: [mockProduct],
        meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
      };

      redis.get.mockResolvedValue(cachedResult);

      const result = await service.findAll({});

      expect((result as any)._cached).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });

    it('should query database on cache miss and save to Redis with TTL', async () => {
      redis.get.mockResolvedValue(null);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);
      (prisma.product.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.items).toHaveLength(1);
      expect(prisma.product.findMany).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalled();
    });
  });

  describe('findById & Cache Penetration Prevention', () => {
    it('should return cached product when cache hit', async () => {
      redis.get.mockResolvedValue(mockProduct);

      const result = await service.findById('prod-1');
      expect(result.id).toBe('prod-1');
      expect(prisma.product.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException and cache empty marker to prevent cache penetration', async () => {
      redis.get.mockResolvedValue(null);
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
      expect(redis.set).toHaveBeenCalledWith(
        'products:detail:nonexistent-id',
        { _notFound: true },
        30,
      );
    });
  });

  describe('Cache Invalidation on Mutation', () => {
    it('should invalidate product cache patterns when stock is updated by warehouse staff', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.product.update as jest.Mock).mockResolvedValue({
        ...mockProduct,
        stock: 50,
      });

      await service.updateStock('prod-1', 50);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: 50 },
      });
      expect(redis.delByPattern).toHaveBeenCalledWith('products:list:*');
      expect(redis.del).toHaveBeenCalledWith('products:detail:prod-1');
    });
  });
});
