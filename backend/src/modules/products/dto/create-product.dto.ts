import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'IP16-PROMAX-256', description: 'Mã định danh sản phẩm (SKU)' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'iPhone 16 Pro Max 256GB', description: 'Tên sản phẩm' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Điện thoại thông minh cao cấp chip A18 Pro', description: 'Mô tả chi tiết' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 34990000, description: 'Đơn giá (VND)' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 50, description: 'Số lượng tồn kho ban đầu' })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: 'Apple', description: 'Thương hiệu sản xuất' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569', description: 'Ảnh sản phẩm' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ description: 'ID của danh mục sản phẩm' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ default: true, description: 'Trạng thái kinh doanh' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
