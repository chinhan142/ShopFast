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
  AlertCircle
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
      setProducts(res.items);
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
            {/* Engineering Hero Showcase */}
            <div className="relative overflow-hidden bg-gradient-to-b from-rose-50/40 via-white to-[#fafbfc] border-b border-slate-200/70 pt-16 pb-20 px-4 sm:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  <span>Kiến Trúc Micro-Services Thu Nhỏ & Đồng Bộ Thời Gian Thực</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                  Nền Tảng Thương Mại Điện Tử Phân Tán <br />
                  <span className="bg-gradient-to-r from-rose-600 to-red-700 bg-clip-text text-transparent">
                    Hiệu Năng Cao & Bền Vững
                  </span>
                </h1>

                <p className="text-sm sm:text-base text-slate-600 max-w-3xl mx-auto leading-relaxed">
                  Thiết kế chuẩn hóa công nghiệp với <strong>NestJS</strong>, vi xử lý nền <strong>BullMQ</strong>, bộ đệm phân tán <strong>Redis 7</strong>, kiểm soát giao dịch <strong>PostgreSQL ACID</strong> triệt tiêu overselling và Trợ lý AI DeepSeek tích hợp <strong>Function Calling</strong> thực tế.
                </p>

                {/* Primary CTA Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={scrollToProducts}
                    className="px-6 py-3 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Khám Phá Thiết Bị</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={scrollToArchitecture}
                    className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Layers className="w-4 h-4 text-slate-500" />
                    <span>Tổng Quan Kiến Trúc Kỹ Thuật</span>
                  </button>
                </div>

                {/* Technical Metric Highlights */}
                <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 text-rose-600 mb-1">
                      <Zap className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Độ trễ Cache</span>
                    </div>
                    <div className="text-lg font-black text-slate-900">&lt; 20 ms</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Phản hồi danh mục qua Redis 7</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kiểm soát kho</span>
                    </div>
                    <div className="text-lg font-black text-slate-900">Zero Oversell</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Atomic Transaction Lock</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 text-sky-600 mb-1">
                      <Server className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Xử lý ngầm</span>
                    </div>
                    <div className="text-lg font-black text-slate-900">BullMQ + DLQ</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Email, hóa đơn & retry lũy thừa</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                      <Bot className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Trí tuệ nhân tạo</span>
                    </div>
                    <div className="text-lg font-black text-slate-900">Tool Calling</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">DeepSeek không ảo giác</p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Engineering & DevOps Architecture Showcase */}
            <div ref={architectureRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-b border-slate-200/60">
              <div className="text-center max-w-3xl mx-auto mb-12">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-600">
                  SYSTEM DESIGN & ARCHITECTURE
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 mb-3">
                  4 Trụ Cột Kỹ Thuật Đạt Chuẩn Enterprise
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Thiết kế theo yêu cầu đặc tả đề tài Module 6: Tối ưu khả năng chịu tải, cách ly phòng sự kiện thời gian thực và tự phục hồi khi có gián đoạn.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pillar 1 */}
                <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Kiểm Soát Giao Dịch Đồng Thời (F06 Concurrency Control)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sử dụng cơ chế <strong>Atomic Database Transaction</strong> với Prisma trên PostgreSQL 16. Mọi lượt trừ tồn kho trong quá trình thanh toán đều được thực hiện tuần tự hóa, ngăn ngừa triệt để hiện tượng Race Condition khi có nhiều người cùng mua món hàng cuối cùng.
                  </p>
                </div>

                {/* Pillar 2 */}
                <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Bộ Đệm Đa Tầng & Invalidation Thông Minh (F04 Redis Caching)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tầng cache phân tán Redis 7 phản hồi danh mục sản phẩm dưới <strong>20ms</strong>. Áp dụng kỹ thuật <strong>Cache Penetration Protection</strong> (cache kết quả rỗng tạm thời) và tự động xóa cache (Invalidation) ngay khi người quản trị cập nhật giá bán hoặc số lượng hàng tồn.
                  </p>
                </div>

                {/* Pillar 3 */}
                <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Hàng Đợi Xử Lý Nền Bất Đồng Bộ (F05 BullMQ & DLQ)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tách rời các luồng xử lý nặng như gửi email xác nhận, xuất hóa đơn điện tử và nhắc nhở thanh toán (30 phút) sang worker BullMQ. Tích hợp thuật toán <strong>Exponential Backoff</strong> (tự động thử lại theo cấp số nhân) và chuyển vào <strong>Dead Letter Queue (DLQ)</strong> nếu có lỗi kéo dài.
                  </p>
                </div>

                {/* Pillar 4 */}
                <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                    <Bot className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Trợ Lý AI Không Ảo Giác (F01 Zero-Hallucination Agent)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tích hợp mô hình ngôn ngữ lớn DeepSeek thông qua giao thức <strong>Native JSON Tool Calling</strong>. AI buộc phải gọi các hàm nghiệp vụ để tra cứu chính xác trạng thái đơn hàng và tồn kho trước khi phát biểu, đồng thời thực thi nguyên tắc <strong>Human-in-the-loop</strong> khi khách yêu cầu hủy/hoàn đơn.
                  </p>
                </div>
              </div>
            </div>

            {/* Products & Storefront Section */}
            <div ref={productsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sản Phẩm Công Nghệ Thực Tế</h2>
                  <p className="text-xs text-slate-500 mt-1">Dữ liệu được nạp trực tiếp từ PostgreSQL và đồng bộ qua bộ nhớ đệm Redis.</p>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Tìm theo tên thiết bị hoặc SKU..."
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
                  <p className="text-xs font-bold text-slate-600">Đang nạp dữ liệu sản phẩm từ máy chủ...</p>
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
            <span>Rikkei Academy Defense Case Study</span>
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
