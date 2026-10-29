import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.SHIPPING,
    description: 'Trạng thái mới của đơn hàng',
  })
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ' })
  @IsNotEmpty()
  status: OrderStatus;
}
