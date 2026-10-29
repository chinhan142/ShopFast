import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiAgentService } from './ai-agent.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { TriageTicketDto } from './dto/triage-ticket.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('AI Customer Support Agent')
@Controller({ path: 'ai', version: '1' })
export class AiAgentController {
  constructor(private readonly aiService: AiAgentService) {}

  @Public()
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Trò chuyện với Trợ lý AI CSKH (Hỗ trợ Tool Calling tra cứu đơn hàng & tồn kho)' })
  @ApiResponse({ status: 200, description: 'Phản hồi từ AI kèm danh sách các công cụ đã được gọi' })
  chatWithAi(
    @Body() dto: ChatMessageDto,
    @CurrentUser('email') email?: string,
  ) {
    return this.aiService.chatWithCustomer(dto, email);
  }

  @Public()
  @Post('triage-ticket')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Phân loại tự động ticket hỗ trợ khách hàng vào nhóm nghiệp vụ (F01)' })
  @ApiResponse({ status: 200, description: 'Nhóm nghiệp vụ được phân loại kèm tóm tắt' })
  triageTicket(@Body() dto: TriageTicketDto) {
    return this.aiService.triageTicket(dto);
  }
}
