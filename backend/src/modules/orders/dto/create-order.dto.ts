import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @ApiProperty({ description: 'ID của sản phẩm đặt mua' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 1, description: 'Số lượng mua' })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto], description: 'Danh sách sản phẩm trong giỏ hàng' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất 1 sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ example: 'Tòa nhà FPT, Số 10 Phạm Văn Bạch, Cầu Giấy, Hà Nội', description: 'Địa chỉ nhận hàng' })
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ nhận hàng không được để trống' })
  shippingAddress: string;

  @ApiProperty({ example: '0987654321', description: 'Số điện thoại nhận hàng' })
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  @ApiPropertyOptional({ example: 'Giao hàng trong giờ hành chính', description: 'Ghi chú cho shipper' })
  @IsOptional()
  @IsString()
  notes?: string;
}
