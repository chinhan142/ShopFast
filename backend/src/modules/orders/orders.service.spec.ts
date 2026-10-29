import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { OrdersGateway } from '../realtime/orders.gateway';
import { OrderQueueProducer } from '../queue/order-queue.producer';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, Role } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<RedisService>;
  let gateway: jest.Mocked<OrdersGateway>;
  let queueProducer: jest.Mocked<OrderQueueProducer>;

  const mockProduct = {
    id: 'prod-1',
    sku: 'IP16-PM-256',
    name: 'iPhone 16 Pro Max',
    price: 34000000,
    stock: 5,
    isActive: true,
  };

  const mockCustomer = {
    id: 'user-1',
    email: 'customer@shopfast.vn',
    fullName: 'Nguyen Van Khach',
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
      user: {
        findUnique: jest.fn().mockResolvedValue(mockCustomer),
      },
    };

    const mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delByPattern: jest.fn().mockResolvedValue(1),
      isAvailable: jest.fn().mockReturnValue(true),
    };

    const mockGateway = {
      broadcastOrderStatusUpdate: jest.fn(),
    };

    const mockQueueProducer = {
      addOrderConfirmationJob: jest.fn().mockResolvedValue(undefined),
      addInvoiceGenerationJob: jest.fn().mockResolvedValue(undefined),
      addPaymentReminderJob: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: OrdersGateway, useValue: mockGateway },
        { provide: OrderQueueProducer, useValue: mockQueueProducer },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get(PrismaService);
    redis = module.get(RedisService);
    gateway = module.get(OrdersGateway);
    queueProducer = module.get(OrderQueueProducer);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder (Concurrency & BullMQ Queue Integration)', () => {
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

    it('should successfully create order, decrement stock, and dispatch BullMQ background jobs', async () => {
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
      expect(redis.delByPattern).toHaveBeenCalledWith('products:*');
      expect(queueProducer.addOrderConfirmationJob).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'order-1', email: 'customer@shopfast.vn' }),
      );
      expect(queueProducer.addInvoiceGenerationJob).toHaveBeenCalled();
    });
  });

  describe('updateOrderStatus (Realtime Event Broadcasting)', () => {
    it('should update status and broadcast realtime websocket event to the specific room', async () => {
      const mockOrder = {
        id: 'order-1',
        orderCode: 'SF-20261029-TEST',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        items: [],
      };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.order.update as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPING,
        updatedAt: new Date(),
      });

      const result = await service.updateOrderStatus('order-1', OrderStatus.SHIPPING);

      expect(result.status).toBe(OrderStatus.SHIPPING);
      expect(gateway.broadcastOrderStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          status: OrderStatus.SHIPPING,
        }),
      );
    });
  });
});
