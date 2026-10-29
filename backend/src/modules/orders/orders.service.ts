import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { OrderStatus, Role } from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    // Execute atomic transaction for inventory checking & order creation (Concurrency Control)
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
        },
      });

      this.logger.log(`Order created successfully: ${createdOrder.orderCode} (Total: ${createdOrder.totalAmount} VND) by User ${userId}`);
      return createdOrder;
    });

    // F04 Cache Invalidation: Invalidate product caches when stock is decremented
    await this.redis.delByPattern('products:*');

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

    // If order is cancelled and was not already cancelled, restore inventory
    if (newStatus === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
      const updated = await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: newStatus },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        this.logger.log(`Order ${order.orderCode} cancelled. Stock restored.`);
        return updatedOrder;
      });

      // Invalidate product caches when stock restored
      await this.redis.delByPattern('products:*');
      return updated;
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    this.logger.log(`Order ${order.orderCode} status updated: ${order.status} -> ${newStatus}`);
    return updatedOrder;
  }
}
