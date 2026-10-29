import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MessageHistoryItem {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsString()
  role: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  content: string;
}

export class ChatMessageDto {
  @ApiProperty({ example: 'Cho tôi hỏi trạng thái của đơn hàng SF-DEMO-001 với', description: 'Câu hỏi của khách hàng' })
  @IsString()
  @IsNotEmpty({ message: 'Tin nhắn không được để trống' })
  message: string;

  @ApiPropertyOptional({ type: [MessageHistoryItem], description: 'Lịch sử đoạn hội thoại trước đó' })
  @IsOptional()
  @IsArray()
  history?: MessageHistoryItem[];
}
