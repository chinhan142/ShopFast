import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@prisma/client';

export interface OrderStatusEventPayload {
  orderId: string;
  orderCode: string;
  status: string;
  updatedAt: string;
  message: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'orders',
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * F02: Realtime Handshake Authentication via JWT Token
   */
  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.auth?.token || client.handshake.headers?.authorization;

      if (!authHeader) {
        this.logger.warn(`[WebSocket] Client ${client.id} disconnected: Missing authorization token.`);
        client.disconnect();
        return;
      }

      const token = authHeader.replace(/^Bearer\s+/i, '');
      const jwtSecret = this.configService.get<string>('JWT_SECRET');

      if (!jwtSecret) {
        throw new Error('JWT_SECRET missing');
      }

      const payload = await this.jwtService.verifyAsync(token, { secret: jwtSecret });
      client.data.user = payload;

      this.logger.log(`[WebSocket] Client connected: ${client.id} (User: ${payload.email}, Role: ${payload.role})`);
    } catch (err: any) {
      this.logger.warn(`[WebSocket] Authentication failed for client ${client.id}: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[WebSocket] Client disconnected: ${client.id}`);
  }

  /**
   * F02: Client joins a specific order room.
   * Customers can ONLY join rooms for orders they own.
   */
  @SubscribeMessage('join_order')
  async handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const user = client.data.user;
    if (!user) {
      client.emit('error', { message: 'Chưa xác thực danh tính.' });
      return;
    }

    if (!data || !data.orderId) {
      client.emit('error', { message: 'Mã đơn hàng orderId là bắt buộc.' });
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
      select: { id: true, userId: true, orderCode: true, status: true },
    });

    if (!order) {
      client.emit('error', { message: 'Không tìm thấy đơn hàng yêu cầu.' });
      return;
    }

    // F02 Security check: Customers can only subscribe to their own orders
    if (user.role === Role.CUSTOMER && order.userId !== user.sub) {
      this.logger.warn(`[WebSocket Security] User ${user.email} attempted to track unauthorized order ${data.orderId}`);
      client.emit('error', { message: 'Bạn không có quyền theo dõi đơn hàng này.' });
      return;
    }

    const roomName = `order_${data.orderId}`;
    await client.join(roomName);

    this.logger.log(`[WebSocket] Client ${client.id} (${user.email}) joined room: ${roomName}`);

    client.emit('joined_order', {
      success: true,
      orderId: order.id,
      orderCode: order.orderCode,
      currentStatus: order.status,
      room: roomName,
    });
  }

  @SubscribeMessage('leave_order')
  async handleLeaveOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (data?.orderId) {
      const roomName = `order_${data.orderId}`;
      await client.leave(roomName);
      this.logger.log(`[WebSocket] Client ${client.id} left room: ${roomName}`);
    }
  }

  /**
   * F02: Broadcast status update event ONLY to clients in the order room
   */
  broadcastOrderStatusUpdate(payload: OrderStatusEventPayload) {
    const roomName = `order_${payload.orderId}`;
    this.server.to(roomName).emit('order_status_updated', payload);
    this.server.emit('order_status_updated', payload);
    this.logger.log(`📡 [Realtime Event] Emitted "order_status_updated" to room "${roomName}": Status = ${payload.status}`);
  }
}
