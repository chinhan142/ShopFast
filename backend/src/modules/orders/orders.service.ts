import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { OrdersGateway } from '../realtime/orders.gateway';
import { OrderQueueProducer } from '../queue/order-queue.producer';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { OrderStatus, Role } from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly ordersGateway: OrdersGateway,
    private readonly orderQueueProducer: OrderQueueProducer,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    // 1. Fetch user to retrieve customer email for notifications
    const customer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true },
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng đặt hàng.');
    }

    // 2. Execute atomic transaction for inventory checking & order creation (Concurrency Control)
    const order = await this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }> = [];

      for (const item of dto.items) {
        // Query product within transaction
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || !product.isActive) {
          throw new NotFoundException(`Sản phẩm với ID "${item.productId}" không tồn tại hoặc đã ngừng kinh doanh.`);
        }

        // F06 Concurrency Check: Verify available inventory
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm "${product.name}" hiện chỉ còn ${product.stock} sản phẩm trong kho, không đủ số lượng ${item.quantity} bạn yêu cầu.`
          );
        }

        // Atomic decrement stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        const subtotal = product.price * item.quantity;
        totalAmount += subtotal;

        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal,
        });
      }

      // Generate human-readable order code (e.g. SF-20261029-A7B8)
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderCode = `SF-${datePart}-${randomSuffix}`;

      // Create Order with Items
      const createdOrder = await tx.order.create({
        data: {
          orderCode,
          userId,
          status: OrderStatus.PENDING,
          totalAmount,
          shippingAddress: dto.shippingAddress.trim(),
          phone: dto.phone.trim(),
          notes: dto.notes?.trim(),
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  imageUrl: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      this.logger.log(`Order created successfully: ${createdOrder.orderCode} (Total: ${createdOrder.totalAmount} VND) by User ${userId}`);
      return createdOrder;
    });

    // 3. F04 Invalidate product cache immediately
    await this.redis.delByPattern('products:*');

    // 4. F05 Push Background Jobs to BullMQ (Async Email, Invoice, Payment Reminder)
    await Promise.all([
      this.orderQueueProducer.addOrderConfirmationJob({
        id: order.id,
        orderCode: order.orderCode,
        totalAmount: order.totalAmount,
        email: customer.email,
      }),
      this.orderQueueProducer.addInvoiceGenerationJob({
        id: order.id,
        orderCode: order.orderCode,
        totalAmount: order.totalAmount,
      }),
      this.orderQueueProducer.addPaymentReminderJob({
        id: order.id,
        orderCode: order.orderCode,
        email: customer.email,
      }),
    ]);

    // F02 Realtime: Broadcast new order event to Warehouse Portal
    try {
      const fullOrder = await this.prisma.order.findUnique({
        where: { id: order.id },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, imageUrl: true } },
            },
          },
        },
      });
      if (fullOrder) {
        this.ordersGateway.broadcastNewOrder(fullOrder);
      }
    } catch (err: any) {
      this.logger.warn(`Could not broadcast new order: ${err.message}`);
    }

    return order;
  }

  async findMyOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  imageUrl: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { userId } }),
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

  async findOrderById(orderId: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                imageUrl: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng có mã ID: ${orderId}`);
    }

    // F02 Security Requirement: Customer can only view their own order
    if (role === Role.CUSTOMER && order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin đơn hàng này.');
    }

    return order;
  }

  async findOrderByCode(orderCode: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderCode: orderCode.toUpperCase().trim() },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
              },
            },
          },
        },
      },
    });

    return order;
  }

  async findAllOrders(query: GetOrdersQueryDto) {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
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

  async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng có ID: ${orderId}`);
    }

    let updatedOrder: any;

    // If order is cancelled and was not already cancelled, restore inventory
    if (newStatus === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
      updatedOrder = await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }

        const res = await tx.order.update({
          where: { id: orderId },
          data: { status: newStatus },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
          },
        });

        this.logger.log(`Order ${order.orderCode} cancelled. Stock restored.`);
        return res;
      });

      // Invalidate product caches when stock restored
      await this.redis.delByPattern('products:*');
    } else {
      updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
      });
    }

    this.logger.log(`Order ${order.orderCode} status updated: ${order.status} -> ${newStatus}`);

    // F02 Realtime: Broadcast status update event to the specific order room
    this.ordersGateway.broadcastOrderStatusUpdate({
      orderId: updatedOrder.id,
      orderCode: updatedOrder.orderCode,
      status: updatedOrder.status,
      updatedAt: updatedOrder.updatedAt ? updatedOrder.updatedAt.toISOString() : new Date().toISOString(),
      message: `Đơn hàng ${updatedOrder.orderCode} đã chuyển sang trạng thái: ${updatedOrder.status}`,
    });

    return updatedOrder;
  }

  async requestCancelOrder(userId: string, orderId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng ID: ${orderId}`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Bạn chỉ có quyền yêu cầu hủy đơn hàng do chính bạn đặt.');
    }

    if (order.status === OrderStatus.SHIPPING || order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException(
        `Đơn hàng "${order.orderCode}" hiện đang ở trạng thái ${order.status} (đã bàn giao vận chuyển), không thể hủy đơn trực tiếp.`
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(`Đơn hàng "${order.orderCode}" đã được hủy trước đó.`);
    }

    // Broadcast Realtime Cancel Request Event to Warehouse & Notification Bell
    this.ordersGateway.broadcastCancelRequest({
      orderId: order.id,
      orderCode: order.orderCode,
      customerName: order.user?.fullName || 'Khách hàng',
      customerEmail: order.user?.email,
      reason: reason?.trim() || 'Khách hàng yêu cầu hủy đơn qua giao diện',
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Yêu cầu hủy đơn ${order.orderCode} đã được chuyển trực tiếp đến Cổng Kho Vận của nhân viên kho.`,
    };
  }

  async handleAiCancelRequest(orderCode: string, customer?: any) {
    const order = await this.findOrderByCode(orderCode);
    if (!order) {
      return {
        success: false,
        message: `Không tìm thấy đơn hàng "${orderCode}" trên hệ thống ShopFast.`,
      };
    }

    if (order.status === OrderStatus.SHIPPING || order.status === OrderStatus.DELIVERED) {
      return {
        success: false,
        cannotCancel: true,
        status: order.status,
        message: `Đơn hàng "${order.orderCode}" hiện đang ở trạng thái ${order.status} (đã bàn giao vận chuyển). Theo quy định, không thể hủy đơn hàng đang giao.`,
      };
    }

    if (order.status === OrderStatus.CANCELLED) {
      return {
        success: false,
        alreadyCancelled: true,
        message: `Đơn hàng "${order.orderCode}" đã ở trạng thái hủy trước đó.`,
      };
    }

    // Broadcast Realtime Cancel Request Event to Warehouse & Notification Bell
    this.ordersGateway.broadcastCancelRequest({
      orderId: order.id,
      orderCode: order.orderCode,
      customerName: customer?.fullName || order.user?.fullName || 'Khách hàng',
      customerEmail: customer?.email || order.user?.email,
      reason: 'Yêu cầu hủy đơn qua Trợ lý AI CSKH (Human-in-the-loop)',
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      status: order.status,
      message: `Đã gửi thông báo hủy đơn khẩn cấp đến Cổng Kho Vận của nhân viên kho Nguyễn Hoàng Long.`,
    };
  }
}
