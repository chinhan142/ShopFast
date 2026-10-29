import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { CartDrawer } from './components/CartDrawer';
import { RealtimeOrderTracker } from './components/RealtimeOrderTracker';
import { WarehousePortal } from './components/WarehousePortal';
import { DevOpsDashboard } from './components/DevOpsDashboard';
import { AiChatWidget } from './components/AiChatWidget';
import { AuthModal } from './components/AuthModal';
import { Product, Category, CartItem, User, Order } from './types';
import { ApiService } from './services/api';
import { 
  Search, 
  Sparkles, 
  Filter, 
  RefreshCw, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Database, 
  Layers, 
  Bot, 
  CheckCircle2, 
  ArrowRight,
  Server,
  Activity,
  AlertCircle,
  TrendingUp,
  Headphones,
  Truck,
  Code2,
  Box,
  Sliders,
  Check
} from 'lucide-react';

interface ToastState {
  type: 'success' | 'info' | 'error';
  message: string;
}

export function App() {
  const [currentTab, setCurrentTab] = useState<'store' | 'tracker' | 'warehouse' | 'devops'>('store');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTrackedOrder, setActiveTrackedOrder] = useState<Order | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Audience toggle for value proposition: 'business' (Investor/Owner) vs 'tech' (Engineering/Judges)
  const [viewPerspective, setViewPerspective] = useState<'business' | 'tech'>('business');

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Toast Notification State
  const [toast, setToast] = useState<ToastState | null>(null);

  const architectureRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Load Initial Data
  useEffect(() => {
    loadCategories();
    loadProducts();
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    if (ApiService.getToken()) {
      try {
        const user = await ApiService.getProfile();
        setCurrentUser(user);
      } catch {
        ApiService.setToken(null);
        setCurrentUser(null);
      }
    }
  };

  const loadCategories = async () => {
    try {
      const data = await ApiService.getCategories();
      setCategories(data);
    } catch (err: any) {
      console.warn('Could not load categories:', err.message);
    }
  };

  const loadProducts = async (catId?: string, search?: string) => {
    setIsLoadingProducts(true);
    try {
      const res = await ApiService.getProducts({
        categoryId: catId,
        search: search || undefined,
        limit: 20,
      });
      setProducts(res.items || []);
    } catch (err: any) {
      console.warn('Could not load products:', err.message);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleCategorySelect = (catId?: string) => {
    setSelectedCategory(catId);
    loadProducts(catId, searchKeyword);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts(selectedCategory, searchKeyword);
  };

  // Cart operations with Mandatory Auth Check
  const handleAddToCart = (product: Product) => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập tài khoản để chọn mua sản phẩm.', 'info');
      handleOpenAuth('login');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });

    showToast(`Đã thêm "${product.name}" vào giỏ hàng thành công!`, 'success');
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleOrderCreated = (order: Order) => {
    setActiveTrackedOrder(order);
    setCurrentTab('tracker');
    showToast(`Đã tạo đơn hàng ${order.orderCode} thành công! Đang chuyển đến trang theo dõi.`, 'success');
  };

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    ApiService.logout();
    setCurrentUser(null);
    showToast('Đã đăng xuất tài khoản.', 'info');
    if (currentTab === 'warehouse' || currentTab === 'devops' || currentTab === 'tracker') {
      setCurrentTab('store');
    }
  };

  const scrollToArchitecture = () => {
    architectureRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col font-sans selection:bg-rose-100 selection:text-rose-800">
      {/* Toast Notification Popup */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-3 fade-in duration-200">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-semibold backdrop-blur-md ${
            toast.type === 'success' 
              ? 'bg-white/95 border-emerald-200 text-emerald-900 shadow-emerald-500/10'
              : toast.type === 'info'
              ? 'bg-white/95 border-amber-200 text-amber-900 shadow-amber-500/10'
              : 'bg-white/95 border-rose-200 text-rose-900 shadow-rose-500/10'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        cartCount={totalCartCount}
        openCart={() => setIsCartOpen(true)}
        currentUser={currentUser}
        onOpenAuthModal={handleOpenAuth}
        onLogout={handleLogout}
        onScrollToArchitecture={scrollToArchitecture}
      />

      {/* Main Views */}
      <main className="flex-1">
        {currentTab === 'store' && (
          <div>
            {/* Commercial Enterprise Hero Showcase */}
            <div className="relative overflow-hidden bg-gradient-to-b from-rose-50/50 via-white to-[#fafbfc] border-b border-slate-200/70 pt-16 pb-20 px-4 sm:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto text-center space-y-6">
                {/* Enterprise Readiness Pill */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-rose-200 text-slate-800 text-xs font-bold tracking-wide shadow-xs">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                  </span>
                  <span>ShopFast Core E-Commerce • Nền Tảng Thương Mại Chuẩn Enterprise</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
                  Giải Pháp Bán Lẻ Công Nghệ <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-rose-600 to-red-700 bg-clip-text text-transparent">
                    Tốc Độ Cao &amp; Chăm Sóc AI Tự Động
                  </span>
                </h1>

                <p className="text-sm sm:text-base text-slate-600 max-w-3xl mx-auto leading-relaxed">
                  Thiết kế hoàn chỉnh, sẵn sàng tùy biến và mở rộng cho doanh nghiệp. Khách hàng tận hưởng trải nghiệm mua hàng dưới 1 giây, trợ lý AI tư vấn thông minh 24/7 và hệ thống theo dõi đơn hàng trực tiếp không độ trễ.
                </p>

                {/* Primary CTA Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={scrollToProducts}
                    className="px-6 py-3 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Xem Trải Nghiệm Mua Hàng</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={scrollToArchitecture}
                    className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Layers className="w-4 h-4 text-rose-600" />
                    <span>Giá Trị Doanh Nghiệp &amp; Kỹ Thuật</span>
                  </button>
                </div>

                {/* Commercial Highlights Grid */}
                <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-rose-200 transition-all">
                    <div className="flex items-center gap-2 text-rose-600 mb-1">
                      <Zap className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tốc Độ Bán Hàng</span>
                    </div>
                    <div className="text-lg font-black text-slate-900">Siêu Tốc &lt; 20ms</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Tải danh mục tức thì, tăng 35% tỷ lệ chốt đơn</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-rose-200 transition-all">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Bảo Vệ Kho Hàng</span>
                    </div>
                    <div className="text-lg font-black text-slate-900">Không Bán Trùng</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Xử lý hàng nghìn khách tranh mua không âm kho</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-rose-200 transition-all">
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                      <Bot className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">CSKH Tự Động</span>
                    </div>
                    <div className="text-lg font-black text-slate-900">DeepSeek AI 24/7</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Tự tra cứu đơn và kho, giảm 70% công trực chat</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-rose-200 transition-all">
                    <div className="flex items-center gap-2 text-sky-600 mb-1">
                      <Truck className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Minh Bạch Đơn</span>
                    </div>
                    <div className="text-lg font-black text-slate-900">Live Realtime</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Khách theo dõi tiến trình đơn ngay khi kho đổi</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Value vs Engineering Depth (Interactive Toggle Section) */}
            <div ref={architectureRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-b border-slate-200/60">
              <div className="text-center max-w-3xl mx-auto mb-10">
                <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4 border border-slate-200">
                  <button
                    onClick={() => setViewPerspective('business')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      viewPerspective === 'business'
                        ? 'bg-white text-rose-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    💼 Dành Cho Doanh Nghiệp &amp; Nhà Đầu Tư
                  </button>
                  <button
                    onClick={() => setViewPerspective('tech')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      viewPerspective === 'tech'
                        ? 'bg-white text-rose-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🛠️ Dành Cho Kỹ Sư &amp; Hội Đồng Chuyên Môn
                  </button>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {viewPerspective === 'business' 
                    ? 'Tại Sao ShopFast Mang Lại Lợi Thế Cạnh Tranh Lớn?' 
                    : 'Kiến Trúc Kỹ Thuật Phân Tán (System Design Matrix)'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                  {viewPerspective === 'business'
                    ? 'Mỗi tính năng đều được tối ưu để tối đa hóa doanh thu, cắt giảm chi phí vận hành và giữ chân khách hàng.'
                    : 'Thiết kế chuẩn hóa công nghiệp: NestJS 10, PostgreSQL 16, Redis 7, BullMQ, Socket.io, DeepSeek Native Tool Calling.'}
                </p>
              </div>

              {/* Business Perspective Cards */}
              {viewPerspective === 'business' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in">
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">Tăng Tỷ Lệ Chốt Đơn</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Khách hàng ghét chờ đợi. Website tải tức thì giúp giảm tỷ lệ thoát trang (Bounce Rate), tăng độ hài lòng và trực tiếp thúc đẩy doanh thu bán lẻ.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-rose-700">
                      <Check className="w-4 h-4" />
                      <span>Tốc độ phản hồi &lt; 20ms</span>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                        <Headphones className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">Tiết Kiệm 70% Chi Phí CSKH</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Trợ lý AI DeepSeek tự động trả lời khách về tình trạng còn hàng, giá cả và tra cứu lộ trình đơn hàng. Chỉ những yêu cầu hoàn hủy phức tạp mới chuyển sang người thật.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700">
                      <Check className="w-4 h-4" />
                      <span>Trực 24/7 không cần trực đêm</span>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                        <Box className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">Bảo Vệ Uy Tín Thương Hiệu</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Vào ngày khuyến mãi lớn (Flash Sale), không bao giờ có chuyện 2 khách hàng cùng đặt trúng 1 món hàng cuối cùng rồi bị hủy đơn do cháy hàng ảo.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                      <Check className="w-4 h-4" />
                      <span>Khóa số lượng chuẩn 100%</span>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                        <Sliders className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">Dễ Dàng Đóng Gói Bán Mã Nguồn</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Hệ thống module hóa độc lập, cấu hình qua file .env và đóng gói Docker 1-click giúp doanh nghiệp mua mã nguồn có thể triển khai lên Cloud ngay trong ngày.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                      <Check className="w-4 h-4" />
                      <span>White-label &amp; Full Docker Ready</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Perspective Cards */}
              {viewPerspective === 'tech' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-mono font-bold text-rose-600">SRS F06</span>
                        <h3 className="text-base font-bold text-slate-900">Kiểm Soát Giao Dịch Đồng Thời (Atomic Transactions)</h3>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Triển khai trên <strong>PostgreSQL 16</strong> thông qua <code>prisma.$transaction</code>. Mỗi luồng đặt hàng được tuần tự hóa nguyên tử (ACID), đảm bảo kiểm tra và trừ tồn kho chính xác tuyệt đối, triệt tiêu mọi rủi ro Race Condition khi hàng nghìn người cùng checkout một lúc.
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-mono font-bold text-amber-600">SRS F04</span>
                        <h3 className="text-base font-bold text-slate-900">Bộ Đệm Redis 7 &amp; Invalidation Thông Minh</h3>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Phản hồi danh mục dưới <strong>20ms</strong> với bộ đệm phân tán Redis. Tích hợp cơ chế <strong>Cache Invalidation</strong> tự động dọn sạch cache khi có biến động giá/kho, kết hợp <strong>Cache Penetration Protection</strong> ngăn chặn tấn công vét cạn tài nguyên database.
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-mono font-bold text-sky-600">SRS F05</span>
                        <h3 className="text-base font-bold text-slate-900">Hàng Đợi Xử Lý Nền BullMQ &amp; Dead-Letter Queue</h3>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Phân tách hoàn toàn các tác vụ tốn tài nguyên (gửi email hóa đơn, hẹn giờ nhắc thanh toán 30 phút) khỏi luồng HTTP chính. Worker BullMQ thực thi với cơ chế <strong>Idempotency</strong>, tự động thử lại theo cấp số nhân (Exponential Backoff) và lưu trữ job lỗi vào <strong>DLQ</strong>.
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-mono font-bold text-indigo-600">SRS F01 &amp; F02</span>
                        <h3 className="text-base font-bold text-slate-900">AI Tool Calling &amp; Realtime WebSockets</h3>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Trợ lý DeepSeek được trang bị schema <strong>Function Calling</strong> thực tế, buộc phải tra cứu database trước khi trả lời (chống ảo giác 100%). Kênh <strong>Socket.io</strong> cô lập room theo từng ID đơn hàng, cập nhật trạng thái kho ngay tức thì tới màn hình khách hàng.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Products & Storefront Section */}
            <div ref={productsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sản Phẩm Công Nghệ Chính Hãng</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Trải nghiệm giỏ hàng và đặt hàng thực tế với các thiết bị công nghệ hàng đầu.
                  </p>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Tìm iPhone, MacBook, Sony..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium shadow-2xs"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </form>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-4 mb-6 no-scrollbar">
                <button
                  onClick={() => handleCategorySelect(undefined)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    selectedCategory === undefined
                      ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/20'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Tất cả danh mục
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/20'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Products Grid */}
              {isLoadingProducts ? (
                <div className="py-24 text-center">
                  <RefreshCw className="w-8 h-8 text-rose-600 animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-600">Đang nạp dữ liệu sản phẩm...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-3xl border border-slate-200/80 p-8">
                  <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-bold text-sm text-slate-800">Không tìm thấy sản phẩm nào</h3>
                  <p className="text-xs text-slate-500 mt-1">Vui lòng thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'tracker' && (
          <RealtimeOrderTracker
            initialOrder={activeTrackedOrder}
            currentUser={currentUser}
            onOpenAuthModal={() => handleOpenAuth('login')}
          />
        )}

        {currentTab === 'warehouse' && (
          <WarehousePortal
            currentUser={currentUser}
            onOpenAuthModal={() => handleOpenAuth('login')}
          />
        )}

        {currentTab === 'devops' && (
          <DevOpsDashboard
            currentUser={currentUser}
            onOpenAuthModal={() => handleOpenAuth('login')}
          />
        )}
      </main>

      {/* Floating Circular AI Support Agent FAB */}
      <AiChatWidget />

      {/* Cart Slide-over Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCart([])}
        onOrderCreated={handleOrderCreated}
      />

      {/* Real Auth Modal for Login & Register */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Chào mừng ${user.fullName} đã đăng nhập thành công!`, 'success');
        }}
      />

      {/* Clean White Tech Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 px-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">ShopFast Tech</span>
            <span>—</span>
            <span>Enterprise E-Commerce Architecture</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-slate-400 font-mono text-[11px]">
            <span>NestJS 10</span>
            <span>•</span>
            <span>PostgreSQL 16 (Prisma)</span>
            <span>•</span>
            <span>Redis 7</span>
            <span>•</span>
            <span>BullMQ</span>
            <span>•</span>
            <span>DeepSeek AI</span>
            <span>•</span>
            <span>Docker</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
