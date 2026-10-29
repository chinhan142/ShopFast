import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, User, Wrench, ShieldAlert } from 'lucide-react';
import { ApiService } from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  usedTools?: string[];
}

export const AiChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Dạ xin chào quý khách! Em là Trợ lý AI CSKH chính thức của sàn ShopFast. Em có thể hỗ trợ tra cứu tiến trình đơn hàng (Tool Calling) hoặc kiểm tra số lượng tồn kho sản phẩm thật. Quý khách cần em hỗ trợ thông tin gì ạ?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.slice(-5).map((m) => ({ role: m.role, content: m.content }));
      const res = await ApiService.chatWithAi(textToSend, history);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          usedTools: res.usedTools,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Xin lỗi quý khách, đã có sự cố kết nối tới dịch vụ AI: ${err.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Circular FAB (Compact, elegant, not covering footer) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Trợ lý AI DeepSeek CSKH (Hỗ trợ tra cứu & kiểm tra kho)"
          className="group relative w-14 h-14 rounded-full bg-gradient-to-tr from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white shadow-xl shadow-rose-600/30 hover:scale-105 active:scale-95 flex items-center justify-center transition-all duration-200 border-2 border-white cursor-pointer"
        >
          <Bot className="w-6 h-6 transition-transform group-hover:scale-110" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[540px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-rose-600 to-red-800 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight">Trợ Lý AI CSKH</h3>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-white/20 text-white border border-white/30">
                    DeepSeek
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[10px] text-rose-100">Tool Calling & Anti-Hallucination</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-rose-100 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 text-xs">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div key={idx} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white ${
                      isUser ? 'bg-slate-800' : 'bg-rose-600'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div className={`space-y-1.5 max-w-[78%]`}>
                    <div
                      className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-rose-600 text-white rounded-tr-xs shadow-xs'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs shadow-2xs'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Tool Invocation Badge */}
                    {msg.usedTools && msg.usedTools.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {msg.usedTools.map((tool, tIdx) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-medium"
                          >
                            <Wrench className="w-2.5 h-2.5 text-amber-600" />
                            Đã gọi Tool: {tool}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
                <div className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                <span className="font-semibold text-[11px] text-slate-500">AI đang suy nghĩ và gọi công cụ kiểm tra dữ liệu thật...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
            <button
              onClick={() => handleSend('Tra cứu tiến trình đơn hàng SF-DEMO-001')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 rounded-lg shrink-0 font-medium text-slate-700 transition-colors"
            >
              📦 Kiểm tra đơn SF-DEMO-001
            </button>
            <button
              onClick={() => handleSend('MacBook Air M3 trong kho còn bao nhiêu cái?')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 rounded-lg shrink-0 font-medium text-slate-700 transition-colors"
            >
              💻 Tồn kho MacBook M3?
            </button>
            <button
              onClick={() => handleSend('Tôi muốn yêu cầu hủy đơn và hoàn lại tiền')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 rounded-lg shrink-0 font-medium text-slate-700 transition-colors"
            >
              🛡️ Yêu cầu hủy đơn (Human-in-the-loop)
            </button>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi về đơn hàng, tồn kho..."
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all disabled:opacity-40 shadow-xs shadow-rose-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
