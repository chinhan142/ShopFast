import React, { useState } from 'react';
import { ShoppingBag, Cpu, User as UserIcon, Shield, PackageCheck, Activity, LogOut, ChevronDown } from 'lucide-react';
import { User } from '../types';
import { ApiService } from '../services/api';

interface HeaderProps {
  currentTab: 'store' | 'tracker' | 'warehouse' | 'devops';
  setCurrentTab: (tab: 'store' | 'tracker' | 'warehouse' | 'devops') => void;
  cartCount: number;
  openCart: () => void;
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  cartCount,
  openCart,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleQuickLogin = async (email: string, pass: string) => {
    setIsLoggingIn(true);
    try {
      const res = await ApiService.login(email, pass);
      onLoginSuccess(res.user);
      setShowUserDropdown(false);
    } catch (err: any) {
      alert(`Đăng nhập thất bại: ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('store')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-800 flex items-center justify-center text-white shadow-md shadow-rose-600/20">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xl tracking-tight text-slate-900">Shop<span className="text-rose-600">Fast</span></span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-rose-50 text-rose-700 border border-rose-200 rounded-md">Tech</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Sàn Công Nghệ Đỉnh Cao</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setCurrentTab('store')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
                currentTab === 'store'
                  ? 'bg-white text-rose-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cửa hàng công nghệ
            </button>
            <button
              onClick={() => setCurrentTab('tracker')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all duration-150 ${
                currentTab === 'tracker'
                  ? 'bg-white text-rose-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Theo dõi Realtime
            </button>
            <button
              onClick={() => setCurrentTab('warehouse')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all duration-150 ${
                currentTab === 'warehouse'
                  ? 'bg-white text-rose-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              Cổng Kho Vận
            </button>
            <button
              onClick={() => setCurrentTab('devops')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all duration-150 ${
                currentTab === 'devops'
                  ? 'bg-white text-rose-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              DevOps & Hệ thống
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Cart Button */}
            <button
              onClick={openCart}
              className="relative p-2 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
              title="Giỏ hàng"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-xs animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Account / 1-Click Demo Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                  {currentUser ? currentUser.fullName.charAt(0) : <UserIcon className="w-3.5 h-3.5" />}
                </div>
                <span className="max-w-[110px] truncate">
                  {currentUser ? currentUser.fullName : 'Tài khoản Demo'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 px-3 z-50">
                  {currentUser ? (
                    <div>
                      <div className="px-3 py-2 bg-slate-50 rounded-xl mb-3 border border-slate-100">
                        <p className="font-bold text-xs text-slate-900">{currentUser.fullName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-rose-100 text-rose-800">
                          Vai trò: {currentUser.role}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          onLogout();
                          setShowUserDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-700 px-2 mb-2 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-rose-600" />
                        Chọn tài khoản test nhanh (1-Click):
                      </p>
                      <div className="space-y-1">
                        <button
                          disabled={isLoggingIn}
                          onClick={() => handleQuickLogin('customer@shopfast.vn', 'Customer@123456')}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                        >
                          <div className="font-semibold text-slate-900">Khách Hàng (Customer)</div>
                          <div className="text-[11px] text-slate-500">customer@shopfast.vn</div>
                        </button>
                        <button
                          disabled={isLoggingIn}
                          onClick={() => handleQuickLogin('warehouse@shopfast.vn', 'Staff@123456')}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                        >
                          <div className="font-semibold text-slate-900">Nhân Viên Kho (Staff)</div>
                          <div className="text-[11px] text-slate-500">warehouse@shopfast.vn</div>
                        </button>
                        <button
                          disabled={isLoggingIn}
                          onClick={() => handleQuickLogin('admin@shopfast.vn', 'Admin@123456')}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                        >
                          <div className="font-semibold text-slate-900">Quản Trị Viên (Admin)</div>
                          <div className="text-[11px] text-slate-500">admin@shopfast.vn</div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
