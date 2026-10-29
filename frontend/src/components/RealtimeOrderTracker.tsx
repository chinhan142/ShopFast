import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { CheckCircle2, Clock, Truck, Package, XCircle, Wifi, RefreshCw, AlertCircle } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { ApiService } from '../services/api';

interface RealtimeOrderTrackerProps {
  initialOrder?: Order | null;
}

const STATUS_STEPS: { key: OrderStatus; label: string; desc: string; icon: any }[] = [
  { key: 'PENDING', label: 'Chờ xác nhận', desc: 'Đơn hàng đã được lưu và kiểm tra tồn kho', icon: Clock },
  { key: 'CONFIRMED', label: 'Đã xác nhận', desc: 'Kho đang đóng gói sản phẩm', icon: Package },
  { key: 'SHIPPING', label: 'Đang vận chuyển', desc: 'Shipper đang trên đường giao hàng', icon: Truck },
  { key: 'DELIVERED', label: 'Giao thành công', desc: 'Đơn hàng đã được giao tận tay khách', icon: CheckCircle2 },
];

export const RealtimeOrderTracker: React.FC<RealtimeOrderTrackerProps> = ({ initialOrder }) => {
  const [orderCodeInput, setOrderCodeInput] = useState(initialOrder?.orderCode || 'SF-DEMO-001');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(initialOrder || null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [liveEventBanner, setLiveEventBanner] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Order details
  const fetchOrder = async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const order = await ApiService.getOrderByCode(code);
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
    } else {
      fetchOrder(orderCodeInput);
    }
  }, [initialOrder]);

  // 2. Establish WebSocket connection with JWT handshake and join room
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
      // F02 Join specific order room
      socketInstance.emit('join_order', { orderId: currentOrder.id });
    });

    socketInstance.on('joined_order', (data) => {
      console.log('Joined order realtime room:', data);
    });

    // F02 Listen for live status update events
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

  const currentStepIndex = currentOrder ? getStepIndex(currentOrder.status) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              Theo Dõi Đơn Hàng Thời Gian Thực (F02 Realtime)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Nhận cập nhật trạng thái đơn ngay tức thì khi kho thay đổi, không cần tải lại trang.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (orderCodeInput) fetchOrder(orderCodeInput);
            }}
            className="flex items-center gap-2 w-full md:w-auto"
          >
            <input
              type="text"
              value={orderCodeInput}
              onChange={(e) => setOrderCodeInput(e.target.value)}
              placeholder="Nhập mã đơn (VD: SF-DEMO-001)"
              className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 w-full md:w-60 font-mono font-semibold"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-xs shadow-rose-600/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Tra cứu</span>
            </button>
          </form>
        </div>

        {/* WebSocket Realtime Connection Status Pill */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold text-slate-700">
              {isSocketConnected
                ? `Kênh Socket.io: Phòng "order_${currentOrder?.id?.slice(0, 8)}..." đang mở`
                : 'Đang kết nối lại tới máy chủ Realtime...'}
            </span>
          </div>
          <div className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5" />
            WebSocket Active
          </div>
        </div>
      </div>

      {/* Live Event Notification Banner */}
      {liveEventBanner && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3 shadow-md shadow-emerald-500/10 animate-pulse-subtle">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4 animate-bounce" />
          </div>
          <div className="flex-1">
            <p className="font-extrabold text-sm text-emerald-900">📡 Tín hiệu Realtime vừa nhận:</p>
            <p className="mt-0.5">{liveEventBanner}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold mb-6 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {currentOrder && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-8">
          {/* Order Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Mã đơn hàng</span>
              <span className="text-xl font-extrabold font-mono text-slate-900">{currentOrder.orderCode}</span>
              <p className="text-xs text-slate-500 mt-1">
                Thời gian đặt: {new Date(currentOrder.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng thanh toán</span>
              <span className="text-2xl font-black text-rose-600 tracking-tight">
                {currentOrder.totalAmount.toLocaleString('vi-VN')} ₫
              </span>
            </div>
          </div>

          {/* Interactive Stepper Timeline */}
          {currentOrder.status === 'CANCELLED' ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center">
              <XCircle className="w-12 h-12 text-rose-600 mx-auto mb-2" />
              <h3 className="text-base font-bold text-rose-900">Đơn hàng này đã bị hủy</h3>
              <p className="text-xs text-rose-700 mt-1">
                Số lượng tồn kho của các sản phẩm trong đơn đã được hoàn trả nguyên vẹn về kho.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Progress Bar Line */}
              <div className="absolute top-5 left-8 right-8 h-1 bg-slate-100 hidden sm:block">
                <div
                  className="h-full bg-rose-600 transition-all duration-700 ease-in-out"
                  style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                />
              </div>

              {/* Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative">
                {STATUS_STEPS.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const Icon = step.icon;

                  return (
                    <div key={step.key} className="flex flex-col items-center text-center">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                          isDone
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                            : isCurrent
                            ? 'bg-white text-rose-600 border-2 border-rose-600 shadow-lg shadow-rose-600/10 ring-4 ring-rose-50'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="mt-3">
                        <span
                          className={`text-xs font-bold block ${
                            isCurrent ? 'text-rose-600' : isDone ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5 block leading-tight max-w-[150px]">
                          {step.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Items & Shipping Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
            {/* Products List */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Sản phẩm trong đơn</h4>
              <div className="space-y-2">
                {currentOrder.items.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.product?.name || 'Sản phẩm công nghệ'}</p>
                      <p className="text-[11px] text-slate-500">Mã: {item.product?.sku} | Số lượng: {item.quantity}</p>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900">
                      {item.subtotal.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Details */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Thông tin giao nhận</h4>
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs space-y-2">
                <div>
                  <span className="text-slate-500 block">Địa chỉ nhận hàng:</span>
                  <span className="font-semibold text-slate-900">{currentOrder.shippingAddress}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Số điện thoại liên hệ:</span>
                  <span className="font-semibold text-slate-900">{currentOrder.phone}</span>
                </div>
                {currentOrder.notes && (
                  <div>
                    <span className="text-slate-500 block">Ghi chú:</span>
                    <span className="font-semibold text-slate-900">{currentOrder.notes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
