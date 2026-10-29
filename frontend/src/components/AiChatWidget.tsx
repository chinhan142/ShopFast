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
    <div className="fixed bottom-5 right-5 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-600 to-red-800 hover:from-rose-700 hover:to-red-900 text-white rounded-2xl shadow-xl shadow-rose-600/25 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-rose-500/30"
        >
          <div className="relative">
            <Bot className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
          </div>
          <span className="text-xs font-bold tracking-wide">Trợ Lý AI CSKH</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
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
                  <h3 className="font-bold text-xs tracking-wide">ShopFast AI Agent</h3>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-white/20 rounded-md">DeepSeek</span>
                </div>
                <p className="text-[10px] text-rose-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Tool Calling & Anti-Hallucination Active
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-rose-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 text-xs">
            {messages.map((m, idx) => {
              const isAi = m.role === 'assistant';

              return (
                <div key={idx} className={`flex gap-2.5 ${isAi ? 'items-start' : 'items-end justify-end'}`}>
                  {isAi && (
                    <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                      AI
                    </div>
                  )}

                  <div className={`max-w-[82%] ${isAi ? '' : 'text-right'}`}>
                    {/* Tool Calling Indicator Pill */}
                    {m.usedTools && m.usedTools.length > 0 && (
                      <div className="mb-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
                        <Wrench className="w-3 h-3 text-indigo-600" />
                        <span>Đã gọi công cụ thật: {m.usedTools.join(', ')}</span>
                      </div>
                    )}

                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isAi
                          ? 'bg-white text-slate-800 border border-slate-200/90 shadow-2xs rounded-tl-xs'
                          : 'bg-rose-600 text-white font-medium rounded-br-xs shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>

                  {!isAi && (
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-[10px]">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
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
