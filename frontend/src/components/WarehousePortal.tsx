import React, { useEffect, useState } from 'react';
import { PackageCheck, RefreshCw, Truck, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import { Order, OrderStatus, User } from '../types';
import { ApiService } from '../services/api';

interface WarehousePortalProps {
  currentUser?: User | null;
  onOpenAuthModal?: () => void;
}

export const WarehousePortal: React.FC<WarehousePortalProps> = ({ currentUser, onOpenAuthModal }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isAuthorized = currentUser && (currentUser.role === 'STAFF' || currentUser.role === 'ADMIN');

  const fetchOrders = async () => {
    if (!isAuthorized) return;
    setIsLoading(true);
    try {
      const res = await ApiService.getAllOrders(filterStatus);
      setOrders(res.items);
    } catch (err: any) {
      console.error('Failed to load warehouse orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchOrders();
    }
  }, [filterStatus, isAuthorized]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const updated = await ApiService.updateOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      setToastMessage(`Đã cập nhật đơn ${updated.orderCode} sang "${newStatus}". Tín hiệu Realtime WebSocket đã phát tới khách!`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      alert(`Không thể cập nhật: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Khu Vực Hạn Chế - Cổng Kho Vận</h2>
        <p className="text-xs text-slate-600 leading-relaxed mb-6 max-w-md mx-auto">
          Chức năng điều phối trạng thái đơn hàng yêu cầu quyền <strong>Nhân Viên Kho (STAFF)</strong> hoặc <strong>Quản Trị Viên (ADMIN)</strong>.
        </p>
        {onOpenAuthModal && (
          <button
            onClick={onOpenAuthModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-600 to-red-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-600/20 hover:from-rose-700 hover:to-red-800 transition-all"
          >
            <span>Đăng Nhập Tài Khoản Kho</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-2">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Phân Hệ Quản Trị Kho Vận Thực Tế</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Điều Phối & Đổi Trạng Thái Đơn Hàng</h1>
          <p className="text-xs text-slate-500 mt-1">
            Mỗi thao tác chuyển trạng thái sẽ ngay lập tức phát sự kiện WebSocket tới màn hình khách hàng và xóa cache Redis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
            <button
              onClick={() => setFilterStatus(undefined)}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                filterStatus === undefined ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                filterStatus === 'PENDING' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Chờ duyệt
            </button>
            <button
              onClick={() => setFilterStatus('SHIPPING')}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                filterStatus === 'SHIPPING' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Đang giao
            </button>
          </div>

          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-3 shadow-sm animate-in fade-in">
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Mã đơn</th>
                <th className="py-3.5 px-4">Khách hàng</th>
                <th className="py-3.5 px-4">Số lượng món</th>
                <th className="py-3.5 px-4">Tổng tiền</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác đổi trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                    Không có đơn hàng nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isUpdating = updatingId === order.id;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {order.orderCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{order.user?.fullName || 'Khách vãng lai'}</div>
                        <div className="text-[11px] text-slate-500">{order.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {order.items?.length || 0} sản phẩm
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-rose-600">
                        {order.totalAmount.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            order.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : order.status === 'SHIPPING'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : order.status === 'CONFIRMED'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : order.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {order.status === 'PENDING' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                              Xác nhận kho
                            </button>
                          )}
                          {order.status === 'CONFIRMED' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(order.id, 'SHIPPING')}
                              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              Giao vận chuyển
                            </button>
                          )}
                          {order.status === 'SHIPPING' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Giao thành công
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
