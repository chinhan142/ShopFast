import React, { useEffect, useState } from 'react';
import { Activity, Database, Server, Cpu, ExternalLink, ShieldAlert, CheckCircle, RefreshCw, ShieldCheck, ArrowRight } from 'lucide-react';
import { ApiService } from '../services/api';
import { User } from '../types';

interface DevOpsDashboardProps {
  currentUser?: User | null;
  onOpenAuthModal?: () => void;
}

export const DevOpsDashboard: React.FC<DevOpsDashboardProps> = ({ currentUser, onOpenAuthModal }) => {
  const [healthData, setHealthData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const isAdmin = currentUser && currentUser.role === 'ADMIN';

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getHealth();
      setHealthData(data);
      setLastCheckTime(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: any) {
      setHealthData({ status: 'error', error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchHealth();
      const interval = setInterval(fetchHealth, 15000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Khu Vực Quản Trị Hệ Thống (ADMIN Only)</h2>
        <p className="text-xs text-slate-600 leading-relaxed mb-6 max-w-md mx-auto">
          Trang giám sát cơ sở hạ tầng, hàng đợi BullMQ và chỉ số sức khỏe hệ thống chỉ dành riêng cho <strong>Quản Trị Viên (ADMIN)</strong>.
        </p>
        {onOpenAuthModal && (
          <button
            onClick={onOpenAuthModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-600 to-red-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-600/20 hover:from-rose-700 hover:to-red-800 transition-all"
          >
            <span>Đăng Nhập Tài Khoản Admin</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  const isHealthy = healthData?.status === 'ok';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Title Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Activity className="w-3.5 h-3.5" />
            <span>F07 Production Infrastructure & Observability</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Giám Sát Vận Hành & Hạ Tầng Hệ Thống</h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi trạng thái thời gian thực của PostgreSQL 16, Redis 7, Bộ nhớ RAM và BullMQ Queue.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Làm mới ({lastCheckTime || 'Đang nạp...'})</span>
        </button>
      </div>

      {/* Health Overview Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Overall Status */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Trạng thái tổng thể</span>
            {isHealthy ? (
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
            ) : (
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">
            {isHealthy ? 'Hoàn Toàn Khỏe Mạnh' : 'Cần Chú Ý'}
          </div>
          <p className="text-[11px] text-slate-500">Mã HTTP 200 từ endpoint /api/v1/health</p>
        </div>

        {/* PostgreSQL Indicator */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">PostgreSQL 16 (Prisma)</span>
            <Database className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">
            {healthData?.info?.database?.status === 'up' ? 'Đang Hoạt Động' : 'Mất Kết Nối'}
          </div>
          <p className="text-[11px] text-slate-500">{healthData?.info?.database?.message || 'Prisma ping check'}</p>
        </div>

        {/* Redis Indicator */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Redis 7 In-Memory</span>
            <Server className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">
            {healthData?.info?.redis?.status === 'up' ? 'Hoạt Động Tốt' : 'Suy Thoái'}
          </div>
          <p className="text-[11px] text-slate-500">{healthData?.info?.redis?.message || 'Redis PING phản hồi < 2ms'}</p>
        </div>
      </div>

      {/* Direct Administrative Links */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Công Cụ Điều Hành Chuyên Sâu</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="http://localhost:3000/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-2xl border border-slate-200/90 hover:border-rose-300 hover:bg-rose-50/40 transition-all flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                Tài Liệu Swagger API Docs
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Kiểm thử trực tiếp tất cả REST API endpoints</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
          </a>

          <a
            href="http://localhost:3000/api/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-2xl border border-slate-200/90 hover:border-rose-300 hover:bg-rose-50/40 transition-all flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                Bảng Điều Khiển Hàng Đợi BullMQ
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Giám sát xử lý background email, invoice và DLQ</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
          </a>
        </div>
      </div>
    </div>
  );
};
