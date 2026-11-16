'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useDesign } from '@/context/DesignContext';
import { formatBDT } from '@/lib/utils';

export function CartDrawer() {
  const { cart, isDrawerOpen, closeDrawer, updateQuantity, removeItem, applyCoupon, loading } =
    useCart();
  const { design } = useDesign();
  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!isDrawerOpen) return null;

  const btnPrimary =
    design === '3'
      ? 'bg-[#5C1B24] hover:bg-[#47141B] text-white'
      : design === '2'
        ? 'bg-slate-900 hover:bg-slate-800 text-white rounded-md'
        : 'bg-[#111113] hover:bg-neutral-800 text-white';

  const handleCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponMsg(null);
    try {
      await applyCoupon(couponInput.trim());
      setCouponMsg({ type: 'ok', text: couponInput.trim() ? 'Privilege code applied.' : 'Coupon removed.' });
    } catch (err) {
      setCouponMsg({ type: 'err', text: (err as Error).message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={closeDrawer}
      />

      <aside className="relative z-10 w-full max-w-md bg-white text-neutral-900 h-full flex flex-col shadow-2xl">
        <div className="px-6 py-5 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5" />
            <h2 className="font-serif text-lg tracking-wide">
              Shopping Bag ({cart?.itemCount || 0})
            </h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="p-1.5 hover:bg-neutral-100 rounded-full"
            aria-label="Close Cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {!cart || cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
              <ShoppingBag className="w-10 h-10 text-neutral-300" />
              <div>
                <p className="font-serif text-lg text-neutral-800">Your bag is currently empty</p>
                <p className="text-sm text-neutral-500 mt-1">
                  Explore our tailored silk, Jamdani, and linen Panjabis.
                </p>
              </div>
              <Link
                href="/products"
                onClick={closeDrawer}
                className={`px-6 py-3 text-xs uppercase tracking-widest font-medium ${btnPrimary}`}
              >
                Explore Collection
              </Link>
            </div>
          ) : (
            cart.items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 pb-5 border-b border-neutral-100 last:border-b-0"
              >
                <Link
                  href={`/products/${item.productSlug}`}
                  onClick={closeDrawer}
                  className="w-20 h-26 bg-neutral-100 shrink-0 overflow-hidden"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                  />
                </Link>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${item.productSlug}`}
                        onClick={closeDrawer}
                        className="text-sm font-medium text-neutral-900 hover:underline line-clamp-2"
                      >
                        {item.productName}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={loading}
                        className="text-neutral-400 hover:text-rose-600 p-1"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {item.color} · Size {item.size}
                    </p>
                    <p className="text-xs text-neutral-700 font-medium mt-1">
                      {formatBDT(item.finalUnitPrice)} each
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="inline-flex items-center border border-neutral-300">
                      <button
                        type="button"
                        disabled={loading || item.quantity <= 1}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2.5 py-1 hover:bg-neutral-100 disabled:opacity-40"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        disabled={loading || item.quantity >= item.availableStock}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2.5 py-1 hover:bg-neutral-100 disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-neutral-900">
                      {formatBDT(item.lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart && cart.items.length > 0 && (
          <div className="border-t border-neutral-200 px-6 py-5 bg-neutral-50 space-y-4">
            <form onSubmit={handleCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder={cart.couponCode ? `Applied: ${cart.couponCode}` : 'Coupon (try ROYAL10)'}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-300 bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs uppercase tracking-wider border border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
              >
                Apply
              </button>
            </form>
            {couponMsg && (
              <p
                className={`text-xs ${couponMsg.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'
                  }`}
              >
                {couponMsg.text}
              </p>
            )}

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span>{formatBDT(cart.subtotal)}</span>
              </div>
              {cart.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount ({cart.couponCode})</span>
                  <span>-{formatBDT(cart.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Est. Delivery</span>
                <span>{cart.deliveryCharge === 0 ? 'Complimentary' : formatBDT(cart.deliveryCharge)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-neutral-900 pt-2 border-t border-neutral-200">
                <span>Total</span>
                <span>{formatBDT(cart.total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="py-3 text-center text-xs uppercase tracking-widest font-medium border border-neutral-300 bg-white hover:bg-neutral-100"
              >
                View Bag
              </Link>
              <Link
                href="/checkout"
                onClick={closeDrawer}
                className={`py-3 text-center text-xs uppercase tracking-widest font-medium inline-flex items-center justify-center gap-1.5 ${btnPrimary}`}
              >
                Checkout <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

