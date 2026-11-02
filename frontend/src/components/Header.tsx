import React, { useState } from 'react';
import { ShoppingBag, Cpu, Shield, PackageCheck, Activity, LogOut, ChevronDown, LogIn, UserPlus, Lock, Menu, X, Store, Network, Bell, AlertCircle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { ApiService } from '../services/api';
import { User } from '../types';

interface HeaderProps {
  currentTab: 'store' | 'tracker' | 'warehouse' | 'devops';
  setCurrentTab: (tab: 'store' | 'tracker' | 'warehouse' | 'devops') => void;
  cartCount: number;
  openCart: () => void;
  currentUser: User | null;
  onOpenAuthModal: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  onScrollToArchitecture?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  cartCount,
  openCart,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onScrollToArchitecture,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const [activeToast, setActiveToast] = useState<{ id: string; type: string; title: string; message: string; time: string } | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; type: string; title: string; message: string; time: string; read: boolean }>>([
    {
      id: 'init-1',
      type: 'system',
      title: 'Hệ thống ShopFast',
      message: 'Kênh thông báo Realtime đã sẵn sàng.',
      time: 'Vừa xong',
      read: true,
    }
  ]);

  React.useEffect(() => {
    const token = ApiService.getToken();
    const wsUrl = window.location.origin;
    const socketInstance: Socket = io(`${wsUrl}/orders`, {
      path: '/socket.io',
      auth: { token: token ? `Bearer ${token}` : undefined },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    const addNoti = (type: string, title: string, message: string) => {
      const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const item = { id: Date.now().toString(), type, title, message, time: now, read: false };
      setNotifications(prev => [item, ...prev.slice(0, 19)]);
      setActiveToast(item);
      setTimeout(() => setActiveToast(null), 6000);
    };

    socketInstance.on('order_cancel_requested', (data: any) => {
      addNoti('cancel_request', '🚨 Yêu Cầu Hủy Đơn Hàng', `Khách hàng ${data.customerName} gửi yêu cầu hủy đơn ${data.orderCode}. Vui lòng kiểm tra tại Cổng Kho Vận!`);
    });

    socketInstance.on('new_order_created', (data: any) => {
      addNoti('new_order', '📦 Đơn Hàng Mới', `Đơn hàng ${data.orderCode} vừa được đặt thành công (${data.totalAmount?.toLocaleString('vi-VN')} ₫).`);
    });

    socketInstance.on('order_status_updated', (data: any) => {
      addNoti('status_update', '🚚 Cập Nhật Đơn Hàng', `Đơn ${data.orderCode} đã chuyển sang trạng thái: ${data.status}.`);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-rose-50 text-rose-700 border border-rose-200">Admin</span>;
      case 'STAFF':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-50 text-amber-700 border border-amber-200">Kho Vận</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-700 border border-slate-200">Khách Hàng</span>;
    }
  };

  const handleTrackerClick = () => {
    if (!currentUser) {
      onOpenAuthModal('login');
      return;
    }
    setCurrentTab('tracker');
  };

  const handleArchitectureClick = () => {
    if (currentTab !== 'store') {
      setCurrentTab('store');
      setTimeout(() => {
        onScrollToArchitecture?.();
      }, 100);
    } else {
      onScrollToArchitecture?.();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none" 
            onClick={() => setCurrentTab('store')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-red-800 flex items-center justify-center text-white shadow-md shadow-rose-600/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight text-slate-900">Shop<span className="text-rose-600">Fast</span></span>
                <span className="px-1.5 py-0.2 text-[10px] font-bold tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-200 rounded-md">Tech</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">High-Performance E-Commerce</p>
            </div>
          </div>

          {/* Clean Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setCurrentTab('store')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                currentTab === 'store'
                  ? 'text-rose-600 bg-rose-50/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Cửa Hàng
            </button>

            <button
              onClick={handleArchitectureClick}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              Kiến Trúc Kỹ Thuật
            </button>

            <button
              onClick={handleTrackerClick}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'tracker'
                  ? 'text-rose-600 bg-rose-50/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {!currentUser && <Lock className="w-3 h-3 text-slate-400" />}
              <span>Tra Cứu Đơn Hàng</span>
            </button>

            {/* Role-based navigation */}
            {currentUser && (currentUser.role === 'STAFF' || currentUser.role === 'ADMIN') && (
              <button
                onClick={() => setCurrentTab('warehouse')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTab === 'warehouse'
                    ? 'text-rose-600 bg-rose-50/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Cổng Kho Vận</span>
              </button>
            )}

            {currentUser && currentUser.role === 'ADMIN' && (
              <button
                onClick={() => setCurrentTab('devops')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTab === 'devops'
                    ? 'text-rose-600 bg-rose-50/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Quản Trị Hệ Thống</span>
              </button>
            )}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Split Screen / Mobile Menu Button */}
            <button
              onClick={() => setShowMobileNav(!showMobileNav)}
              className="md:hidden p-2 text-slate-700 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer flex items-center justify-center"
              title="Menu điều hướng"
              aria-label="Toggle navigation menu"
            >
              {showMobileNav ? <X className="w-4 h-4 text-rose-600" /> : <Menu className="w-4 h-4" />}
            </button>

            {/* Realtime Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotiDropdown(!showNotiDropdown);
                  if (!showNotiDropdown) {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                  }
                }}
                className="relative p-2.5 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200/60 hover:border-rose-200 cursor-pointer"
                title="Thông báo hệ thống Realtime"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {showNotiDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 px-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-rose-600" />
                      Thông báo Realtime ({notifications.length})
                    </span>
                    {notifications.length > 0 && (
                      <button
                        onClick={() => setNotifications([])}
                        className="text-[10px] text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        Xóa tất cả
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-1.5">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Chưa có thông báo nào
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl border text-xs transition-all ${
                            n.type === 'cancel_request'
                              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                              : n.type === 'new_order'
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              : 'bg-slate-50 border-slate-200/80 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold flex items-center gap-1 text-[11px]">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed opacity-90">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cart Button */}
            <button
              onClick={openCart}
              className="relative p-2.5 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200/60 hover:border-rose-200 cursor-pointer"
              title="Giỏ hàng"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Auth Profile / Login & Register Actions */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {currentUser.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{currentUser.fullName}</span>
                  {getRoleBadge(currentUser.role)}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 px-3 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2.5 bg-slate-50 rounded-xl mb-2.5 border border-slate-100">
                      <p className="font-bold text-xs text-slate-900">{currentUser.fullName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Vai trò:</span>
                        {getRoleBadge(currentUser.role)}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentTab('tracker');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors mb-1 cursor-pointer"
                    >
                      Đơn hàng của tôi
                    </button>

                    {currentUser && (currentUser.role === 'STAFF' || currentUser.role === 'ADMIN') && (
                      <button
                        onClick={() => {
                          setCurrentTab('warehouse');
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-xl transition-colors mb-1 cursor-pointer flex items-center gap-2"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Cổng Kho Vận</span>
                      </button>
                    )}

                    {currentUser && currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          setCurrentTab('devops');
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors mb-1 cursor-pointer flex items-center gap-2"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Quản Trị Hệ Thống</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserDropdown(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border-t border-slate-100 pt-2.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng Xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuthModal('login')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng Nhập</span>
                </button>
                <button
                  onClick={() => onOpenAuthModal('register')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 rounded-xl shadow-xs shadow-rose-600/20 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Đăng Ký</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Split-Screen & Mobile Navigation Drawer */}
      {showMobileNav && (
        <div className="md:hidden border-t border-slate-200/90 bg-white/95 backdrop-blur-md px-4 py-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-2 gap-2 max-w-7xl mx-auto">
            <button
              onClick={() => {
                setCurrentTab('store');
                setShowMobileNav(false);
              }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'store'
                  ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200 shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100'
              }`}
            >
              <Store className="w-4 h-4 text-rose-600" />
              <span>Cửa Hàng</span>
            </button>

            <button
              onClick={() => {
                handleTrackerClick();
                setShowMobileNav(false);
              }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'tracker'
                  ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200 shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100'
              }`}
            >
              <PackageCheck className="w-4 h-4 text-rose-600" />
              <span>Theo Dõi Đơn</span>
            </button>

            <button
              onClick={() => {
                handleArchitectureClick();
                setShowMobileNav(false);
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100"
            >
              <Network className="w-4 h-4 text-slate-500" />
              <span>Kiến Trúc Kỹ Thuật</span>
            </button>

            {currentUser && (currentUser.role === 'STAFF' || currentUser.role === 'ADMIN') && (
              <button
                onClick={() => {
                  setCurrentTab('warehouse');
                  setShowMobileNav(false);
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'warehouse'
                    ? 'bg-amber-50 text-amber-800 font-bold border border-amber-300 shadow-xs'
                    : 'bg-amber-50/50 text-amber-700 hover:bg-amber-100/60 border border-amber-200/60'
                }`}
              >
                <PackageCheck className="w-4 h-4 text-amber-600" />
                <span>Cổng Kho Vận</span>
              </button>
            )}

            {currentUser && currentUser.role === 'ADMIN' && (
              <button
                onClick={() => {
                  setCurrentTab('devops');
                  setShowMobileNav(false);
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'devops'
                    ? 'bg-rose-50 text-rose-800 font-bold border border-rose-300 shadow-xs'
                    : 'bg-rose-50/50 text-rose-700 hover:bg-rose-100/60 border border-rose-200/60'
                }`}
              >
                <Activity className="w-4 h-4 text-rose-600" />
                <span>Quản Trị Hệ Thống</span>
              </button>
            )}
          </div>
        </div>
      )}
          {/* Realtime Floating Toast Notification */}
      {activeToast && (
        <div className="fixed top-20 right-6 z-50 max-w-sm bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-8 h-8 rounded-xl bg-rose-600/30 border border-rose-500/40 flex items-center justify-center shrink-0 text-rose-400">
            {activeToast.type === 'cancel_request' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <Bell className="w-4 h-4 text-amber-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-bold text-white mb-0.5">{activeToast.title}</h5>
            <p className="text-[11px] text-slate-300 leading-snug">{activeToast.message}</p>
            <span className="text-[9px] text-slate-400 mt-1 inline-block font-mono">{activeToast.time}</span>
          </div>
          <button
            onClick={() => setActiveToast(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};
