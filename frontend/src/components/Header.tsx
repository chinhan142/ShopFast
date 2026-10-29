import React, { useState } from 'react';
import { ShoppingBag, Cpu, Shield, PackageCheck, Activity, LogOut, ChevronDown, LogIn, UserPlus, Lock } from 'lucide-react';
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
          <div className="flex items-center gap-3">
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
    </header>
  );
};
