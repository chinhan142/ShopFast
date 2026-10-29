import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Orders')
@Controller({ path: 'orders', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @Throttle({ strict: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Khách hàng tạo đơn hàng mới (Kiểm soát tồn kho bằng Transaction & Throttled: 10 req/min)' })
  @ApiResponse({ status: 201, description: 'Tạo đơn hàng thành công' })
  @ApiResponse({ status: 400, description: 'Hết hàng hoặc số lượng không đủ' })
  @ApiResponse({ status: 429, description: 'Thao tác đặt hàng quá nhanh' })
  createOrder(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(userId, dto);
  }

  @Get('my-orders')
  @Roles(Role.CUSTOMER, Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách lịch sử đơn hàng của người dùng hiện tại' })
  @ApiResponse({ status: 200, description: 'Danh sách đơn hàng của tôi' })
  getMyOrders(
    @CurrentUser('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.findMyOrders(userId, page, limit);
  }

  @Get('code/:code')
  @Roles(Role.CUSTOMER, Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Tra cứu đơn hàng theo mã đơn (Dành cho AI Agent và Khách)' })
  @ApiResponse({ status: 200, description: 'Thông tin chi tiết đơn hàng' })
  getOrderByCode(@Param('code') code: string) {
    return this.ordersService.findOrderByCode(code);
  }

  @Get(':id')
  @Roles(Role.CUSTOMER, Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Xem chi tiết đơn hàng theo ID (Bảo mật: chỉ chủ đơn hoặc nhân viên)' })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng' })
  @ApiResponse({ status: 403, description: 'Không có quyền xem đơn hàng của người khác' })
  getOrderById(
    @Param('id') orderId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.findOrderById(orderId, userId, role);
  }

  @Get()
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Xem toàn bộ danh sách đơn hàng trong hệ thống (Dành cho Kho / Admin)' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả đơn hàng' })
  getAllOrders(@Query() query: GetOrdersQueryDto) {
    return this.ordersService.findAllOrders(query);
  }

  @Patch(':id/status')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng (Dành cho Nhân viên kho / Admin)' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  updateOrderStatus(
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(orderId, dto.status);
  }
}
