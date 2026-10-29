import React from 'react';
import { ShoppingCart, Check, Zap } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isAdding?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, isAdding }) => {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 10;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 hover:border-rose-200 shadow-xs hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-200 flex flex-col overflow-hidden">
      {/* Product Image Box */}
      <div className="relative aspect-4/3 w-full bg-slate-50 overflow-hidden flex items-center justify-center p-4">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Zap className="w-8 h-8" />
          </div>
        )}

        {/* Brand Tag */}
        {product.brand && (
          <span className="absolute top-3 left-3 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-white/90 backdrop-blur-xs text-slate-800 rounded-md border border-slate-200 shadow-2xs">
            {product.brand}
          </span>
        )}

        {/* Stock Badge (Pastel Colors) */}
        <div className="absolute top-3 right-3">
          {isOutOfStock ? (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
              Hết hàng
            </span>
          ) : isLowStock ? (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
              Chỉ còn {product.stock}
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
              Sẵn hàng ({product.stock})
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-mono text-slate-400 mb-1">SKU: {product.sku}</div>
          <h3 className="font-bold text-sm text-slate-900 group-hover:text-rose-600 transition-colors line-clamp-2 mb-1.5 leading-snug">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Price & Action */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Giá chính hãng</span>
            <span className="text-base font-extrabold text-rose-600 tracking-tight">
              {product.price.toLocaleString('vi-VN')} <span className="text-xs font-semibold">₫</span>
            </span>
          </div>

          <button
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock || isAdding}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-150 ${
              isOutOfStock
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs hover:shadow-md hover:shadow-rose-600/20 active:scale-95'
            }`}
          >
            {isAdding ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <ShoppingCart className="w-3.5 h-3.5" />
            )}
            <span>{isOutOfStock ? 'Hết hàng' : 'Chọn mua'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
