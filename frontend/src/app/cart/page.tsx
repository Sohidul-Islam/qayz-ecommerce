'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, Tag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useDesign } from '@/context/DesignContext';
import { useAnalytics } from '@/context/AnalyticsContext';
import { formatBDT } from '@/lib/utils';

export default function CartPage() {
  const { cart, loading, updateQuantity, removeItem, applyCoupon } = useCart();
  const { design } = useDesign();
  const { trackEvent } = useAnalytics();

  const [coupon, setCoupon] = useState('');
  const [couponStatus, setCouponStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    trackEvent({ eventType: 'Cart Viewed', cartId: cart?.cartId ?? null, pagePath: '/cart' });
  }, [cart?.cartId, trackEvent]);

  const pageBg =
    design === '3'
      ? 'bg-[#FAF5EB] text-[#241715]'
      : design === '2'
        ? 'bg-white text-slate-900'
        : 'bg-[#F8F6F1] text-[#111113]';

  const btnPrimary =
    design === '3'
      ? 'bg-[#5C1B24] hover:bg-[#47141B] text-white'
      : design === '2'
        ? 'bg-slate-900 hover:bg-slate-800 text-white rounded-lg'
        : 'bg-[#111113] hover:bg-neutral-800 text-white';

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponStatus(null);
    try {
      await applyCoupon(coupon.trim());
      setCouponStatus({
        type: 'ok',
        msg: coupon.trim() ? `Coupon ${coupon.trim().toUpperCase()} applied.` : 'Coupon cleared.',
      });
    } catch (err) {
      setCouponStatus({ type: 'err', msg: (err as Error).message });
    }
  };

  return (
    <div className={`${pageBg} min-h-[75vh] py-12`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pb-8 border-b border-current/15 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] opacity-60">QAYZ Atelier</p>
            <h1 className="font-serif text-3xl sm:text-4xl mt-1">Shopping Bag</h1>
          </div>
          <Link href="/products" className="text-xs uppercase tracking-widest underline underline-offset-4">
            Continue Shopping
          </Link>
        </div>

        {!cart || cart.items.length === 0 ? (
          <div className="py-20 text-center space-y-5">
            <ShoppingBag className="w-12 h-12 mx-auto opacity-30" />
            <h2 className="font-serif text-2xl">Your Shopping Bag is Empty</h2>
            <p className="text-sm opacity-70 max-w-md mx-auto">
              Browse our handcrafted silk, Jamdani, and linen Panjabis to start building your order.
            </p>
            <Link
              href="/products"
              className={`inline-flex items-center gap-2 px-8 py-3.5 text-xs uppercase tracking-widest font-medium ${btnPrimary}`}
            >
              Browse Collection <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Cart Items */}
            <div className="lg:col-span-8 space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-current/15 p-4 sm:p-5 flex gap-4 sm:gap-6 items-center"
                >
                  <Link href={`/products/${item.productSlug}`} className="w-20 sm:w-24 aspect-[3/4] bg-neutral-100 shrink-0 overflow-hidden">
                    <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                  </Link>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Link href={`/products/${item.productSlug}`} className="font-serif text-lg hover:underline block">
                      {item.productName}
                    </Link>
                    <p className="text-xs opacity-65">
                      Color: {item.color} · Size: {item.size} · SKU: {item.sku}
                    </p>
                    <p className="text-sm font-medium">{formatBDT(item.finalUnitPrice)}</p>
                    {item.discountPerUnit > 0 && (
                      <p className="text-xs text-emerald-700">
                        Saved {formatBDT(item.discountPerUnit)} per piece
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                    <div className="inline-flex items-center border border-neutral-300">
                      <button
                        type="button"
                        disabled={loading || item.quantity <= 1}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2.5 py-1.5 hover:bg-neutral-100 disabled:opacity-35"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        disabled={loading || item.quantity >= item.availableStock}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2.5 py-1.5 hover:bg-neutral-100 disabled:opacity-35"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right min-w-[85px]">
                      <p className="text-sm font-semibold">{formatBDT(item.lineTotal)}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-rose-600 hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-4">
              <div className="bg-white border border-current/15 p-6 space-y-5 sticky top-24">
                <h2 className="font-serif text-xl border-b border-neutral-100 pb-3">
                  Order Summary
                </h2>

                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <label className="text-xs uppercase tracking-wider opacity-70 block">
                    Privilege / Coupon Code
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 opacity-45 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={coupon}
                        onChange={(e) => setCoupon(e.target.value)}
                        placeholder={cart.couponCode || 'ROYAL10 / EID500'}
                        className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-300 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-xs uppercase tracking-wider border border-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  {couponStatus && (
                    <p
                      className={`text-xs ${couponStatus.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                    >
                      {couponStatus.msg}
                    </p>
                  )}
                </form>

                <div className="space-y-2.5 text-sm border-t border-neutral-100 pt-4">
                  <div className="flex justify-between">
                    <span className="opacity-70">Subtotal ({cart.itemCount} items)</span>
                    <span>{formatBDT(cart.subtotal)}</span>
                  </div>
                  {cart.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Coupon Discount ({cart.couponCode})</span>
                      <span>-{formatBDT(cart.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="opacity-70">Estimated Delivery</span>
                    <span>
                      {cart.deliveryCharge === 0 ? 'Complimentary' : formatBDT(cart.deliveryCharge)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-semibold pt-3 border-t border-neutral-200">
                    <span>Estimated Total</span>
                    <span>{formatBDT(cart.total)}</span>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className={`w-full py-3.5 text-xs uppercase tracking-[0.2em] font-semibold inline-flex items-center justify-center gap-2 transition-colors ${btnPrimary}`}
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

