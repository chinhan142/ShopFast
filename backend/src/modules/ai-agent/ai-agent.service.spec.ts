import { Test, TestingModule } from '@nestjs/testing';
import { AiAgentService } from './ai-agent.service';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { TicketCategory, OrderStatus } from '@prisma/client';

describe('AiAgentService (F01 AI CSKH & Tool Calling)', () => {
  let service: AiAgentService;
  let ordersService: jest.Mocked<OrdersService>;
  let productsService: jest.Mocked<ProductsService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'AI_API_KEY') return 'your_ai_api_key_here'; // test fallback mode
        return null;
      }),
    };

    const mockOrdersService = {
      findOrderByCode: jest.fn(),
    };

    const mockProductsService = {
      findBySku: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<AiAgentService>(AiAgentService);
    ordersService = module.get(OrdersService);
    productsService = module.get(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chatWithCustomer (F01 Security & Human-in-the-loop)', () => {
    it('should politely refuse out-of-scope questions', async () => {
      const result = await service.chatWithCustomer({
        message: 'Thời tiết ngày mai ở Hà Nội thế nào?',
      });

      expect(result.reply).toContain('ngoài phạm vi');
      expect(result.usedTools).toHaveLength(0);
    });

    it('should enforce Human-in-the-loop for sensitive cancellation or refund requests', async () => {
      const result = await service.chatWithCustomer({
        message: 'Tôi muốn yêu cầu hủy đơn hàng và hoàn tiền lại',
      });

      expect(result.reply).toContain('Human-in-the-loop');
      expect(result.reply).toContain('Nhân viên CSKH con người');
    });

    it('should query real database for order tracking tool calling', async () => {
      (ordersService.findOrderByCode as jest.Mock).mockResolvedValue({
        id: 'ord-1',
        orderCode: 'SF-DEMO-001',
        status: OrderStatus.CONFIRMED,
        totalAmount: 39980000,
        items: [{ product: { name: 'iPhone 16 Pro Max' }, quantity: 1 }],
      });

      const result = await service.chatWithCustomer({
        message: 'Kiểm tra giúp tôi đơn hàng SF-DEMO-001',
      });

      expect(result.reply).toContain('SF-DEMO-001');
      expect(result.reply).toContain('CONFIRMED');
      expect(result.usedTools).toContain('get_order_status');
    });
  });

  describe('triageTicket (F01 Automatic Ticket Classification)', () => {
    it('should accurately classify return/refund tickets', async () => {
      const result = await service.triageTicket({
        subject: 'Màn hình bị nứt vỡ khi mở hộp',
        description: 'Tôi muốn đổi trả sản phẩm mới và được hoàn tiền',
      });

      expect(result.category).toBe(TicketCategory.RETURN_REFUND);
      expect(result.aiSummary).toContain('RETURN_REFUND');
    });

    it('should accurately classify order inquiry tickets', async () => {
      const result = await service.triageTicket({
        subject: 'Đơn hàng SF-DEMO-001 giao chậm',
        description: 'Đã 3 ngày chưa thấy shipper liên hệ giao hàng',
      });

      expect(result.category).toBe(TicketCategory.ORDER_INQUIRY);
    });
  });
});
