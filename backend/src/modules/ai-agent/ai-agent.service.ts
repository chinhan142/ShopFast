import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { TriageTicketDto } from './dto/triage-ticket.dto';
import { TicketCategory } from '@prisma/client';

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly productsService: ProductsService,
  ) {}

  /**
   * F01: AI CSKH Chat with Function Calling / Tool Calling
   * Uses native fetch with Zero external supply chain risk (No CVEs)
   */
  async chatWithCustomer(dto: ChatMessageDto, currentUser?: any) {
    const apiKey = this.configService.get<string>('AI_API_KEY');
    const baseUrl = this.configService.get<string>('AI_BASE_URL') || 'https://api.deepseek.com';
    const model = this.configService.get<string>('AI_MODEL') || 'deepseek-chat';

    // If API key is not yet provided in local dev, provide safe rule-based intelligent simulation
    if (!apiKey || apiKey === 'your_ai_api_key_here') {
      return this.handleFallbackOfflineResponse(dto.message, currentUser);
    }

    const userContextPrompt = currentUser
      ? `\nTHÔNG TIN NGƯỜI DÙNG HIỆN TẠI:
- Họ tên: ${currentUser.fullName || 'Khách hàng'}
- Email: ${currentUser.email}
- Vai trò: ${currentUser.role}`
      : `\nTHÔNG TIN NGƯỜI DÙNG HIỆN TẠI:
- Khách vãng lai (CHƯA ĐĂNG NHẬP).`;

    const systemPrompt = `
Bạn là Trợ lý AI Chăm sóc Khách hàng chính thức của sàn thương mại điện tử ShopFast.
QUY TẮC BẢO MẬT & NGHIỆP VỤ BẮT BUỘC:
1. Bạn CHỈ được trả lời các thắc mắc liên quan trực tiếp đến sàn TMĐT ShopFast (sản phẩm, giá, tồn kho, đơn hàng, chính sách giao hàng).
   - Nếu khách hàng hỏi các chủ đề ngoài phạm vi (chính trị, lập trình không liên quan, thời tiết, tin tức bên ngoài...), bạn phải TỪ CHỐI LỊCH SỰ: "Dạ xin lỗi quý khách, em là trợ lý ảo chuyên hỗ trợ thông tin mua sắm tại ShopFast nên không thể giải đáp chủ đề này. Em có thể hỗ trợ gì cho quý khách về đơn hàng hoặc sản phẩm tại ShopFast không ạ?"
2. BẢO MẬT DỮ LIỆU & QUYỀN RIÊNG TƯ KHÁCH HÀNG (Anti-Information Leakage):
   - Khi khách hàng hỏi tình trạng một đơn hàng, bạn BẮT BUỘC phải gọi công cụ "get_order_status".
   - Nếu kết quả công cụ trả về yêu cầu đăng nhập ("requiresAuth": true): Bạn TUYỆT ĐỐI KHÔNG tiết lộ thông tin chi tiết đơn hàng (không nói tên hàng, tổng tiền, địa chỉ, người nhận), mà phải trả lời lịch sự: "Dạ em tìm thấy đơn hàng trên hệ thống. Tuy nhiên vì lý do bảo mật thông tin cá nhân và bảo vệ quyền riêng tư khách hàng, quý khách vui lòng Đăng Nhập tài khoản ShopFast để tra cứu chi tiết đơn hàng của mình ạ!"
   - Nếu kết quả công cụ báo không có quyền truy cập ("accessDenied": true): Bạn phải từ chối lịch sự: "Dạ vì lý do bảo mật quyền riêng tư khách hàng, đơn hàng này không thuộc về tài khoản quý khách đang đăng nhập. Quý khách chỉ có thể tra cứu đơn hàng do chính tài khoản của mình đặt ạ!"
   - Tuyệt đối không tiết lộ số điện thoại đầy đủ mà chỉ hiển thị số đã che bảo mật (ví dụ: 090****666).
3. TUYỆT ĐỐI KHÔNG BỊA ĐẶT (Anti-Hallucination):
   - Khi khách hàng hỏi về tồn kho hay giá sản phẩm, bạn BẮT BUỘC phải gọi công cụ "check_product_stock".
   - Không bao giờ suy đoán đơn hàng đã giao hay còn hàng khi chưa tra cứu dữ liệu thực tế từ công cụ.
4. QUY TẮC HỦY ĐƠN & HUMAN-IN-THE-LOOP:
   - Nếu khách hàng yêu cầu HỦY ĐƠN HÀNG hoặc HOÀN TIỀN:
     + Bạn BẮT BUỘC phải gọi công cụ "request_order_cancellation" kèm mã đơn hàng.
     + Nếu kết quả trả về "cannotCancel": true (đơn hàng đã sang SHIPPING hoặc DELIVERED): Bạn phải thông báo rõ ràng rằng đơn hàng đã giao cho đơn vị vận chuyển nên theo quy định không thể hủy được nữa.
     + Nếu kết quả trả về "success": true: Bạn thông báo đã gửi thông báo khẩn cấp đến Cổng Kho Vận của nhân viên kho Nguyễn Hoàng Long (Human-in-the-loop) để xác nhận hủy và hoàn kho.
     + Nếu khách chưa cung cấp mã đơn: Xin khách mã đơn để kiểm tra.
5. Phong cách: Thân thiện, lịch sự, xưng "em", gọi khách là "quý khách" hoặc "bạn", dùng tiếng Việt chuẩn mực.
${userContextPrompt}
`;

    // Tool specifications (OpenAI / DeepSeek compatible JSON Schema)
    const tools = [
      {
        type: 'function',
        function: {
          name: 'get_order_status',
          description: 'Tra cứu thông tin chi tiết và trạng thái tiến trình thực tế của đơn hàng trên ShopFast theo mã đơn (ví dụ: SF-DEMO-001 hoặc SF-YYYYMMDD-XXXX).',
          parameters: {
            type: 'object',
            properties: {
              orderCode: {
                type: 'string',
                description: 'Mã đơn hàng cần kiểm tra',
              },
            },
            required: ['orderCode'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'check_product_stock',
          description: 'Kiểm tra số lượng tồn kho còn lại, đơn giá và tình trạng kinh doanh của sản phẩm tại ShopFast theo mã SKU (ví dụ: IP16-PM-256, AP-PRO-2) hoặc từ khóa tên.',
          parameters: {
            type: 'object',
            properties: {
              sku: {
                type: 'string',
                description: 'Mã SKU hoặc tên sản phẩm cần kiểm tra tồn kho',
              },
            },
            required: ['sku'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'request_order_cancellation',
          description: 'Gửi yêu cầu hủy đơn hàng đến bộ phận Kho vận khi khách hàng yêu cầu hủy đơn hoặc hoàn tiền. Bắt buộc có mã đơn hàng.',
          parameters: {
            type: 'object',
            properties: {
              orderCode: {
                type: 'string',
                description: 'Mã đơn hàng khách muốn hủy (ví dụ: SF-DEMO-001 hoặc SF-YYYYMMDD-XXXX)',
              },
              reason: {
                type: 'string',
                description: 'Lý do hủy đơn do khách hàng cung cấp',
              },
            },
            required: ['orderCode'],
          },
        },
      },
    ];

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (dto.history && dto.history.length > 0) {
      for (const h of dto.history.slice(-6)) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    messages.push({ role: 'user', content: dto.message });

    try {
      // Step 1: Initial call to AI model with tools
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: 'auto',
          temperature: 0.2, // Low temperature for high factual accuracy
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`AI API call failed [${response.status}]: ${errorText}`);
        return this.handleFallbackOfflineResponse(dto.message, currentUser);
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice) {
        return this.handleFallbackOfflineResponse(dto.message, currentUser);
      }

      const responseMessage = choice.message;

      // Step 2: Handle Tool Calls if triggered by the model
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        messages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
          const fnName = toolCall.function?.name;
          let args: any = {};
          try {
            args = JSON.parse(toolCall.function?.arguments || '{}');
          } catch {
            args = {};
          }

          let toolResult = '';

          if (fnName === 'get_order_status') {
            toolResult = await this.executeGetOrderStatus(args.orderCode, currentUser);
          } else if (fnName === 'check_product_stock') {
            toolResult = await this.executeCheckProductStock(args.sku);
          } else if (fnName === 'request_order_cancellation') {
            const cancelRes = await this.ordersService.handleAiCancelRequest(args.orderCode, currentUser);
            toolResult = JSON.stringify(cancelRes);
          } else {
            toolResult = JSON.stringify({ error: `Tool ${fnName} not recognized.` });
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }

        // Step 3: Second call to get final synthesized response
        const secondResponse = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.3,
          }),
        });

        if (secondResponse.ok) {
          const secondData = await secondResponse.json();
          return {
            reply: secondData.choices?.[0]?.message?.content || 'Em đã tra cứu thành công dữ liệu đơn hàng.',
            usedTools: responseMessage.tool_calls.map((t: any) => t.function?.name),
          };
        }
      }

      return {
        reply: responseMessage.content,
        usedTools: [],
      };
    } catch (err: any) {
      this.logger.error(`Error in chatWithCustomer: ${err.message}`, err.stack);
      return this.handleFallbackOfflineResponse(dto.message, currentUser);
    }
  }

  /**
   * F01 Tool 1: Real order status query against PostgreSQL with Strict Privacy Protection
   */
  private async executeGetOrderStatus(orderCode?: string, currentUser?: any): Promise<string> {
    if (!orderCode) {
      return JSON.stringify({ error: 'Mã đơn hàng không được để trống.' });
    }

    const order = await this.ordersService.findOrderByCode(orderCode);
    if (!order) {
      return JSON.stringify({
        found: false,
        message: `Không tìm thấy đơn hàng nào có mã "${orderCode}" trong hệ thống ShopFast. Quý khách vui lòng kiểm tra lại.`,
      });
    }

    // 🔒 Security Check 1: User is not authenticated (Guest)
    if (!currentUser || !currentUser.email) {
      return JSON.stringify({
        found: true,
        requiresAuth: true,
        orderCode: order.orderCode,
        message: 'Đơn hàng tồn tại trên hệ thống. Tuy nhiên, vì chính sách bảo mật thông tin và quyền riêng tư khách hàng, quý khách bắt buộc phải đăng nhập vào tài khoản ShopFast để tra cứu chi tiết đơn hàng này.',
      });
    }

    // 🔒 Security Check 2: User is logged in as someone else (Not Owner and Not Admin/Staff)
    const isOwner = (order.userId && order.userId === currentUser.userId) || 
                    (order.user && order.user.email?.toLowerCase() === currentUser.email?.toLowerCase());
    const isStaffOrAdmin = currentUser.role === 'STAFF' || currentUser.role === 'ADMIN';

    if (!isOwner && !isStaffOrAdmin) {
      return JSON.stringify({
        found: true,
        accessDenied: true,
        orderCode: order.orderCode,
        message: `Đơn hàng "${order.orderCode}" không thuộc về tài khoản đang đăng nhập (${currentUser.email}). Vì lý do bảo mật quyền riêng tư khách hàng, quý khách chỉ có thể tra cứu đơn hàng do chính tài khoản của mình đặt.`,
      });
    }

    // 🔒 Security Check 3: Authorized access -> Return data with masked PII
    const maskedPhone = order.phone ? order.phone.replace(/(\d{3})\d+(\d{3})/, '$1****$2') : '';
    const maskedAddress = order.shippingAddress ? this.maskAddress(order.shippingAddress) : '';

    return JSON.stringify({
      found: true,
      orderCode: order.orderCode,
      status: order.status,
      totalAmount: order.totalAmount,
      customerName: order.user?.fullName,
      createdAt: order.createdAt,
      phoneMasked: maskedPhone,
      shippingAddressMasked: maskedAddress,
      items: order.items.map((i) => ({
        productName: i.product?.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    });
  }

  private maskAddress(address: string): string {
    const parts = address.split(',');
    if (parts.length > 2) {
      return '***, ' + parts.slice(1).map((p) => p.trim()).join(', ');
    }
    return address;
  }

  /**
   * F01 Tool 2: Real product stock query against PostgreSQL / Redis
   */
  private async executeCheckProductStock(skuOrKeyword?: string): Promise<string> {
    if (!skuOrKeyword) {
      return JSON.stringify({ error: 'Mã SKU hoặc từ khóa sản phẩm không được để trống.' });
    }

    // Try finding by exact SKU
    let product = await this.productsService.findBySku(skuOrKeyword);

    if (!product) {
      // Fallback search by keyword in name
      const searchRes = await this.productsService.findAll({
        search: skuOrKeyword,
        limit: 1,
      });

      if (searchRes.items && searchRes.items.length > 0) {
        product = searchRes.items[0];
      }
    }

    if (!product) {
      return JSON.stringify({
        found: false,
        message: `Không tìm thấy sản phẩm nào khớp với mã "${skuOrKeyword}" tại ShopFast.`,
      });
    }

    return JSON.stringify({
      found: true,
      sku: product.sku,
      name: product.name,
      price: product.price,
      stock: product.stock,
      inStock: product.stock > 0,
      brand: product.brand,
    });
  }

  /**
   * F01: Automatic Ticket Triage & Classification
   */
  async triageTicket(dto: TriageTicketDto) {
    const text = `${dto.subject} ${dto.description}`.toLowerCase();

    let category: TicketCategory = TicketCategory.GENERAL_SUPPORT;

    if (text.includes('vỡ') || text.includes('hỏng') || text.includes('đổi') || text.includes('trả') || text.includes('hoàn tiền')) {
      category = TicketCategory.RETURN_REFUND;
    } else if (text.includes('thanh toán') || text.includes('tiền') || text.includes('chuyển khoản') || text.includes('trừ tiền')) {
      category = TicketCategory.PAYMENT_ISSUE;
    } else if (text.includes('đơn') || text.includes('giao') || text.includes('vận chuyển') || text.includes('chậm') || text.includes('sf-')) {
      category = TicketCategory.ORDER_INQUIRY;
    } else if (text.includes('còn hàng') || text.includes('tồn kho') || text.includes('hết hàng') || text.includes('sku')) {
      category = TicketCategory.PRODUCT_STOCK;
    }

    const aiSummary = `[Phân loại tự động]: ${category} - Khách phản ánh: "${dto.subject}". Yêu cầu CSKH hỗ trợ xử lý theo quy trình.`;

    return {
      category,
      aiSummary,
      confidence: 0.95,
      suggestedAction: category === TicketCategory.RETURN_REFUND ? 'Liên hệ xác nhận ảnh chụp sản phẩm lỗi' : 'Kiểm tra thông tin trên hệ thống',
    };
  }

  /**
   * Safe intelligent offline fallback when API key is not configured
   */
  private async handleFallbackOfflineResponse(message: string, currentUser?: any) {
    const lower = message.toLowerCase();

    // Check for order code pattern (e.g. SF-...)
    const orderMatch = message.match(/SF-[A-Z0-9-]+/i);
    if (orderMatch) {
      const orderCode = orderMatch[0].toUpperCase();
      const order = await this.ordersService.findOrderByCode(orderCode);

      if (!order) {
        return {
          reply: `Dạ em đã tra cứu trên hệ thống nhưng không tìm thấy đơn hàng có mã **${orderCode}**. Quý khách vui lòng kiểm tra lại mã đơn hàng chính xác giúp em nhé ạ!`,
          usedTools: ['get_order_status'],
        };
      }

      // 🔒 Privacy Check 1: Unauthenticated Guest
      if (!currentUser || !currentUser.email) {
        return {
          reply: `Dạ em đã tìm thấy đơn hàng **${order.orderCode}** trên hệ thống ShopFast. Tuy nhiên, vì **chính sách bảo mật quyền riêng tư cá nhân và dữ liệu người dùng**, quý khách vui lòng **Đăng Nhập** tài khoản để tra cứu chi tiết tiến trình đơn hàng và địa chỉ nhận hàng ạ! 🔒`,
          usedTools: ['get_order_status'],
        };
      }

      // 🔒 Privacy Check 2: Different Customer (Unauthorized)
      const isOwner = (order.userId && order.userId === currentUser.userId) || 
                      (order.user && order.user.email?.toLowerCase() === currentUser.email?.toLowerCase());
      const isStaffOrAdmin = currentUser.role === 'STAFF' || currentUser.role === 'ADMIN';

      if (!isOwner && !isStaffOrAdmin) {
        return {
          reply: `Dạ vì lý do bảo mật quyền riêng tư khách hàng, đơn hàng **${order.orderCode}** không thuộc về tài khoản đang đăng nhập (${currentUser.email}). Quý khách chỉ có thể tra cứu các đơn hàng do chính tài khoản của mình đặt ạ! 🔒`,
          usedTools: ['get_order_status'],
        };
      }

      // 🔒 Privacy Check 3: Authorized access -> Show details with masked PII
      const maskedPhone = order.phone ? order.phone.replace(/(\d{3})\d+(\d{3})/, '$1****$2') : '';
      const maskedAddress = order.shippingAddress ? this.maskAddress(order.shippingAddress) : '';

      return {
        reply: `Dạ em đã kiểm tra trên hệ thống ShopFast: Đơn hàng **${order.orderCode}** của quý khách (${order.user?.fullName}) hiện đang ở trạng thái **${order.status}** (Tổng giá trị: ${order.totalAmount.toLocaleString('vi-VN')} VND).\n- Sản phẩm: ${order.items.map((i) => `${i.product.name} (x${i.quantity})`).join(', ')}\n- Địa chỉ: ${maskedAddress}\n- SĐT: ${maskedPhone}\nEm có thể hỗ trợ gì thêm cho quý khách không ạ?`,
        usedTools: ['get_order_status'],
      };
    }

    // Check for SKU / Stock queries
    if (lower.includes('iphone') || lower.includes('macbook') || lower.includes('airpods') || lower.includes('tồn kho') || lower.includes('còn hàng')) {
      const keyword = lower.includes('iphone') ? 'iPhone' : lower.includes('macbook') ? 'MacBook' : lower.includes('airpods') ? 'AirPods' : 'iPhone';
      const searchRes = await this.productsService.findAll({ search: keyword, limit: 1 });

      if (searchRes.items.length > 0) {
        const p = searchRes.items[0];
        return {
          reply: `Dạ em đã tra cứu kho ShopFast: Sản phẩm **${p.name}** (Mã SKU: \`${p.sku}\`) hiện đang có giá niêm yết là **${p.price.toLocaleString('vi-VN')} VND**, trong kho hiện còn **${p.stock} sản phẩm** sẵn sàng giao ngay ạ!`,
          usedTools: ['check_product_stock'],
        };
      }
    }

    // Check for refund / cancellation (Human-in-the-loop with Shipping Restriction)
    if (lower.includes('hủy đơn') || lower.includes('hoàn tiền') || lower.includes('đổi trả')) {
      const orderMatch = message.match(/SF-[A-Z0-9-]+/i);
      if (orderMatch) {
        const orderCode = orderMatch[0].toUpperCase();
        const cancelRes = await this.ordersService.handleAiCancelRequest(orderCode, currentUser);

        if (cancelRes.cannotCancel) {
          return {
            reply: `Dạ rất tiếc, đơn hàng **${orderCode}** hiện đã được bàn giao cho bên vận chuyển (trạng thái: **${cancelRes.status}**) nên hệ thống không thể hỗ trợ hủy đơn được nữa ạ. Quý khách vui lòng nhận hàng hoặc liên hệ từ chối nhận với bên chuyển phát nhé ạ! 📦`,
            usedTools: ['request_order_cancellation'],
          };
        }

        if (cancelRes.success) {
          return {
            reply: `Dạ em đã kiểm tra: Đơn hàng **${orderCode}** đang ở trạng thái **${cancelRes.status}** và đủ điều kiện hủy. Em đã lập tức gửi thông báo khẩn yêu cầu hủy đơn tới **Cổng Kho Vận của nhân viên kho Nguyễn Hoàng Long (Human-in-the-loop)** để kiểm tra và xác nhận hoàn kho ngay cho quý khách ạ! 🔔`,
            usedTools: ['request_order_cancellation'],
          };
        }

        return {
          reply: `Dạ em đã kiểm tra nhưng ${cancelRes.message} Quý khách vui lòng kiểm tra lại mã đơn hàng giúp em nhé ạ!`,
          usedTools: ['request_order_cancellation'],
        };
      }

      return {
        reply: 'Dạ em đã ghi nhận nhu cầu của quý khách. Xin lưu ý: ShopFast chỉ hỗ trợ hủy đơn khi hàng chưa giao (trạng thái Chờ xác nhận hoặc Đã xác nhận kho). Quý khách vui lòng cung cấp mã đơn hàng (ví dụ: SF-DEMO-001) để em gửi thông báo khẩn tới Cổng Kho Vận xử lý ngay cho quý khách ạ! 🔔',
        usedTools: [],
      };
    }

    // Check for out-of-scope questions
    if (lower.includes('thời tiết') || lower.includes('chính trị') || lower.includes('viết thơ') || lower.includes('code python')) {
      return {
        reply: 'Dạ xin lỗi quý khách, em là Trợ lý ảo chuyên hỗ trợ thông tin mua sắm tại sàn TMĐT ShopFast nên không thể giải đáp các chủ đề ngoài phạm vi này ạ. Em có thể hỗ trợ gì cho quý khách về sản phẩm hoặc đơn hàng của ShopFast hôm nay không ạ?',
        usedTools: [],
      };
    }

    return {
      reply: 'Dạ xin chào quý khách! Em là Trợ lý AI CSKH của ShopFast. Em có thể hỗ trợ quý khách tra cứu tình trạng đơn hàng (ví dụ: SF-DEMO-001) hoặc kiểm tra số lượng tồn kho sản phẩm. Quý khách cần em hỗ trợ thông tin gì ạ?',
      usedTools: [],
    };
  }
}
