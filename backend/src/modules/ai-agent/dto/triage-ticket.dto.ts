import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TriageTicketDto {
  @ApiProperty({ example: 'Sản phẩm giao bị vỡ màn hình', description: 'Tiêu đề của ticket' })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  subject: string;

  @ApiProperty({
    example: 'Tôi vừa nhận gói hàng đơn SF-DEMO-001 lúc sáng nay thì mở ra thấy màn hình bị nứt vỡ, tôi muốn đổi trả hàng và hoàn tiền.',
    description: 'Mô tả chi tiết vấn đề',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  description: string;
}
