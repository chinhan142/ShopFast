import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import { CartItem, Order } from '../types';
import { ApiService } from '../services/api';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onOrderCreated: (order: Order) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderCreated,
}) => {
  const [shippingAddress, setShippingAddress] = useState('Số 10 Phạm Văn Bạch, Cầu Giấy, Hà Nội');
  const [phone, setPhone] = useState('0905555666');
  const [notes, setNotes] = useState('Giao trong giờ hành chính, gọi trước khi đến');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const orderData = {
        items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        shippingAddress,
        phone,
        notes,
      };

      const order = await ApiService.createOrder(orderData);
      onClearCart();
      onClose();
      onOrderCreated(order);
    } catch (err: any) {
      setError(err.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
              Giỏ hàng của bạn
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                {cart.length} món
              </span>
            </h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <X className="w-8 h-8" />
                </div>
                <p className="font-semibold text-sm text-slate-700">Giỏ hàng đang trống</p>
                <p className="text-xs text-slate-400 mt-1">Hãy khám phá các thiết bị công nghệ hấp dẫn nhé!</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/80 flex gap-3 items-center">
                  <img
                    src={item.product.imageUrl || ''}
                    alt={item.product.name}
                    className="w-14 h-14 object-cover rounded-lg bg-white border border-slate-200/80"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{item.product.name}</h4>
                    <p className="text-xs font-extrabold text-rose-600 mt-0.5">
                      {item.product.price.toLocaleString('vi-VN')} ₫
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-white">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 text-slate-500 hover:text-slate-800"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 text-slate-500 hover:text-slate-800"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => onRemoveItem(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Section */}
          {cart.length > 0 && (
            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
              {error && (
                <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleCheckout} className="space-y-2.5 mb-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Địa chỉ nhận hàng *</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    placeholder="Số nhà, đường, quận, thành phố"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Số điện thoại liên hệ *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    placeholder="0912345678"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Ghi chú giao hàng</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    placeholder="Ghi chú cho shipper"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Tổng thanh toán:</span>
                  <span className="text-lg font-extrabold text-rose-600 tracking-tight">
                    {totalAmount.toLocaleString('vi-VN')} ₫
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    'Đang xử lý trừ kho & tạo đơn...'
                  ) : (
                    <>
                      <span>Xác nhận đặt hàng</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Giao dịch khóa nguyên tử (Atomic Lock) chống oversell</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
