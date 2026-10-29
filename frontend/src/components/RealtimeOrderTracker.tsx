import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { CheckCircle2, Clock, Truck, Package, XCircle, Wifi, RefreshCw, AlertCircle, Search, UserCheck } from 'lucide-react';
import { Order, OrderStatus, User } from '../types';
import { ApiService } from '../services/api';

interface RealtimeOrderTrackerProps {
  initialOrder?: Order | null;
  currentUser?: User | null;
  onOpenAuthModal?: () => void;
}

const STATUS_STEPS: { key: OrderStatus; label: string; desc: string; icon: any }[] = [
  { key: 'PENDING', label: 'Chờ xác nhận', desc: 'Đơn hàng đã được lưu và kiểm tra tồn kho', icon: Clock },
  { key: 'CONFIRMED', label: 'Đã xác nhận', desc: 'Kho đang đóng gói sản phẩm', icon: Package },
  { key: 'SHIPPING', label: 'Đang vận chuyển', desc: 'Shipper đang trên đường giao hàng', icon: Truck },
  { key: 'DELIVERED', label: 'Giao thành công', desc: 'Đơn hàng đã được giao tận tay khách', icon: CheckCircle2 },
];

export const RealtimeOrderTracker: React.FC<RealtimeOrderTrackerProps> = ({ 
  initialOrder, 
  currentUser, 
  onOpenAuthModal 
}) => {
  const [orderCodeInput, setOrderCodeInput] = useState(initialOrder?.orderCode || '');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(initialOrder || null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [liveEventBanner, setLiveEventBanner] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's recent orders if logged in
  useEffect(() => {
    if (currentUser) {
      loadMyOrders();
    } else {
      setMyOrders([]);
    }
  }, [currentUser]);

  const loadMyOrders = async () => {
    try {
      const res = await ApiService.getMyOrders(1, 5);
      setMyOrders(res.items || []);
      if (!currentOrder && res.items && res.items.length > 0) {
        setCurrentOrder(res.items[0]);
        setOrderCodeInput(res.items[0].orderCode);
      }
    } catch (err: any) {
      console.warn('Could not load user orders:', err.message);
    }
  };

  // Tra cứu đơn hàng theo mã
  const fetchOrder = async (code: string) => {
    if (!code.trim()) {
      setError('Vui lòng nhập mã đơn hàng để tra cứu.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const order = await ApiService.getOrderByCode(code.trim());
      if (!order) {
        setError(`Không tìm thấy đơn hàng "${code}".`);
        return;
      }
      setCurrentOrder(order);
    } catch (err: any) {
      setError(err.message || 'Không thể tra cứu đơn hàng.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrder) {
      setCurrentOrder(initialOrder);
      setOrderCodeInput(initialOrder.orderCode);
    }
  }, [initialOrder]);

  // Kết nối Socket.io Realtime khi có đơn hàng
  useEffect(() => {
    if (!currentOrder) return;

    const token = ApiService.getToken() || '';
    const socketInstance = io('/orders', {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setIsSocketConnected(true);
      socketInstance.emit('join_order', { orderId: currentOrder.id });
    });

    socketInstance.on('order_status_updated', (eventData: { orderId: string; status: OrderStatus; message: string }) => {
      if (eventData.orderId === currentOrder.id) {
        setCurrentOrder((prev) => (prev ? { ...prev, status: eventData.status } : null));
        setLiveEventBanner(eventData.message);
        setTimeout(() => setLiveEventBanner(null), 8000);
      }
    });

    socketInstance.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.emit('leave_order', { orderId: currentOrder.id });
      socketInstance.disconnect();
    };
  }, [currentOrder?.id]);

  const getStepIndex = (status: OrderStatus) => {
    if (status === 'CANCELLED') return -1;
    return STATUS_STEPS.findIndex((s) => s.key === status);
  };

  const currentStepIdx = currentOrder ? getStepIndex(currentOrder.status) : -1;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Search & Realtime Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              <span>F02 Realtime Order Tracking</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Theo Dõi Đơn Hàng Trực Tiếp</h2>
            <p className="text-xs text-slate-500 mt-1">
              Nhận thông báo cập nhật tiến trình đơn hàng tức thì qua WebSocket từ hệ thống kho.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold self-start sm:self-auto">
            <Wifi className={`w-3.5 h-3.5 ${isSocketConnected ? 'text-emerald-600' : 'text-amber-500 animate-pulse'}`} />
            <span className={isSocketConnected ? 'text-emerald-700' : 'text-amber-700'}>
              {isSocketConnected ? 'Kênh Realtime: Đã kết nối' : 'Đang kết nối Realtime...'}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchOrder(orderCodeInput);
          }}
          className="flex flex-col sm:flex-row items-center gap-2.5"
        >
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={orderCodeInput}
              onChange={(e) => setOrderCodeInput(e.target.value)}
              placeholder="Nhập mã đơn hàng cần tra cứu (ví dụ: SF-DEMO-001)..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 shrink-0"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Tra Cứu</span>
          </button>
        </form>

        {/* User's recent orders quick bar */}
        {currentUser && myOrders.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block mb-2">Đơn hàng gần đây của bạn:</span>
            <div className="flex flex-wrap gap-2">
              {myOrders.map((ord) => (
                <button
                  key={ord.id}
                  onClick={() => {
                    setOrderCodeInput(ord.orderCode);
                    setCurrentOrder(ord);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                    currentOrder?.id === ord.id
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {ord.orderCode} ({ord.status})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Not logged in hint */}
        {!currentUser && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-slate-400" />
              <span>Bạn có tài khoản? Đăng nhập để tự động theo dõi lịch sử đơn hàng của mình.</span>
            </div>
            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="font-bold text-rose-600 hover:text-rose-700 underline text-xs shrink-0 ml-2"
              >
                Đăng nhập ngay
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-700 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Event Notification Banner */}
      {liveEventBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 shadow-sm animate-in slide-in-from-top-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <div className="font-semibold">{liveEventBanner}</div>
        </div>
      )}

      {/* Order Progress Details */}
      {currentOrder && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-8 animate-in fade-in">
          {/* Order Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-semibold text-slate-400">Mã đơn hàng</span>
              <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">{currentOrder.orderCode}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ngày đặt: {new Date(currentOrder.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs font-semibold text-slate-400">Tổng giá trị đơn</span>
              <div className="text-2xl font-black text-rose-600">
                {currentOrder.totalAmount.toLocaleString('vi-VN')} ₫
              </div>
              <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                {currentOrder.status}
              </span>
            </div>
          </div>

          {/* Stepper Progress */}
          {currentOrder.status !== 'CANCELLED' ? (
            <div className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {STATUS_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isCompleted = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <div
                      key={step.key}
                      className={`relative p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20'
                          : isCompleted
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-slate-50/50 border-slate-200/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                            isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-bold ${isCurrent ? 'text-rose-700' : 'text-slate-800'}`}>
                          {step.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-700">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">Đơn hàng này đã bị hủy.</span> Vui lòng liên hệ Trợ lý AI CSKH nếu quý khách cần trợ giúp thêm.
              </div>
            </div>
          )}

          {/* Ordered Items List */}
          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Danh sách sản phẩm trong đơn</h4>
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/40">
              {currentOrder.items.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {item.product?.imageUrl && (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product?.name || 'Sản phẩm'}
                        className="w-12 h-12 object-cover rounded-xl border border-slate-200"
                      />
                    )}
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{item.product?.name || 'Sản phẩm'}</h5>
                      <p className="text-[11px] text-slate-500 font-mono">SKU: {item.product?.sku || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">
                      {(item.subtotal || item.unitPrice * item.quantity).toLocaleString('vi-VN')} ₫
                    </div>
                    <div className="text-[11px] text-slate-500">Số lượng: x{item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
