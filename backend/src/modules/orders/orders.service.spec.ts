import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus, Role } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: jest.Mocked<PrismaService>;

  const mockProduct = {
    id: 'prod-1',
    sku: 'IP16-PM-256',
    name: 'iPhone 16 Pro Max',
    price: 34000000,
    stock: 5,
    isActive: true,
  };

  beforeEach(async () => {
    const mockPrisma = {
      $transaction: jest.fn(),
      order: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder (Concurrency & Inventory Control)', () => {
    it('should throw BadRequestException when requested quantity exceeds available stock', async () => {
      // Setup transaction mock
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          product: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockProduct,
              stock: 2, // only 2 left in stock
            }),
            update: jest.fn(),
          },
          order: {
            create: jest.fn(),
          },
        };
        return callback(tx);
      });

      // Customer attempts to order 5 items
      await expect(
        service.createOrder('user-1', {
          items: [{ productId: 'prod-1', quantity: 5 }],
          shippingAddress: '123 Pham Van Bach, Cau Giay, Ha Noi',
          phone: '0987654321',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create order and decrement stock atomically when inventory is sufficient', async () => {
      const mockCreatedOrder = {
        id: 'order-1',
        orderCode: 'SF-20261029-TEST',
        userId: 'user-1',
        totalAmount: 34000000,
        status: OrderStatus.PENDING,
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 1,
            unitPrice: 34000000,
            subtotal: 34000000,
          },
        ],
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          product: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockProduct,
              stock: 5,
            }),
            update: jest.fn().mockResolvedValue({
              ...mockProduct,
              stock: 4,
            }),
          },
          order: {
            create: jest.fn().mockResolvedValue(mockCreatedOrder),
          },
        };
        return callback(tx);
      });

      const result = await service.createOrder('user-1', {
        items: [{ productId: 'prod-1', quantity: 1 }],
        shippingAddress: '123 Pham Van Bach, Cau Giay, Ha Noi',
        phone: '0987654321',
      });

      expect(result.id).toBe('order-1');
      expect(result.totalAmount).toBe(34000000);
    });
  });

  describe('findOrderById (Security & Role Access)', () => {
    it('should throw ForbiddenException when a customer attempts to view another user order', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-99',
        userId: 'other-user-id',
        status: OrderStatus.PENDING,
      });

      await expect(
        service.findOrderById('order-99', 'my-user-id', Role.CUSTOMER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow warehouse staff or admin to view any customer order', async () => {
      const mockOrder = {
        id: 'order-99',
        userId: 'customer-user-id',
        status: OrderStatus.PENDING,
      };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

      const result = await service.findOrderById('order-99', 'staff-user-id', Role.STAFF);
      expect(result.id).toBe('order-99');
    });
  });
});
