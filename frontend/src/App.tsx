import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { CartDrawer } from './components/CartDrawer';
import { RealtimeOrderTracker } from './components/RealtimeOrderTracker';
import { WarehousePortal } from './components/WarehousePortal';
import { DevOpsDashboard } from './components/DevOpsDashboard';
import { AiChatWidget } from './components/AiChatWidget';
import { Product, Category, CartItem, User, Order } from './types';
import { ApiService } from './services/api';
import { Search, Sparkles, Filter, RefreshCw, Cpu, ShieldCheck, Zap } from 'lucide-react';

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

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
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
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        cartCount={totalCartCount}
        openCart={() => setIsCartOpen(true)}
        currentUser={currentUser}
        onLoginSuccess={(u) => setCurrentUser(u)}
        onLogout={() => {
          ApiService.logout();
          setCurrentUser(null);
        }}
      />

      {/* Main Tab Views */}
      <main className="flex-1">
        {currentTab === 'store' && (
          <div>
            {/* Tech Hero Banner - Clean White Canvas with Subtle Crimson Aura */}
            <div className="relative overflow-hidden bg-gradient-to-b from-rose-50/60 via-white to-[#fafbfc] border-b border-slate-200/60 py-12 px-4 sm:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold tracking-wide uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  <span>Nền tảng thương mại điện tử công nghệ thế hệ mới</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                  Trải nghiệm công nghệ đỉnh cao cùng <span className="text-rose-600">ShopFast</span>
                </h1>

                <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  Tích hợp AI CSKH thông minh, theo dõi đơn hàng thời gian thực qua WebSocket, bộ nhớ đệm Redis siêu tốc và giao dịch an toàn chống oversell.
                </p>

                {/* Key Pillars Badges */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <Zap className="w-3.5 h-3.5 text-rose-600" />
                    <span>Redis Cache &lt;20ms</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Transaction Lock</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                    <span>DeepSeek AI Agent</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter and Products Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Category Pills & Search Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                {/* Categories */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                  <button
                    onClick={() => handleCategorySelect(undefined)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                      selectedCategory === undefined
                        ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/20'
                        : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    Tất cả danh mục
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                        selectedCategory === cat.id
                          ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/20'
                          : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Search Box */}
                <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Tìm iPhone, MacBook, Sony..."
                    className="w-full pl-9 pr-3.5 py-2 bg-white text-xs text-slate-900 border border-slate-200/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </form>
              </div>

              {/* Product Grid */}
              {isLoadingProducts ? (
                <div className="py-24 text-center">
                  <RefreshCw className="w-8 h-8 text-rose-600 animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-600">Đang tải danh mục thiết bị công nghệ...</p>
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

        {currentTab === 'tracker' && <RealtimeOrderTracker initialOrder={activeTrackedOrder} />}
        {currentTab === 'warehouse' && <WarehousePortal />}
        {currentTab === 'devops' && <DevOpsDashboard />}
      </main>

      {/* Floating AI Support Agent Widget */}
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

      {/* Clean White Tech Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 px-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">ShopFast Tech</span>
            <span>—</span>
            <span>Defense Case Study 6 (Rikkei Academy)</span>
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
