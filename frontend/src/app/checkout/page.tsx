'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Truck, CreditCard, Banknote, Smartphone } from 'lucide-react';
import {
  DeliveryZone,
  apiFetch,
  fetchDeliveryZones,
  getStoredCartToken,
} from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useDesign } from '@/context/DesignContext';
import { useAnalytics } from '@/context/AnalyticsContext';
import { formatBDT } from '@/lib/utils';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, refreshCart } = useCart();
  const { design } = useDesign();
  const { trackEvent, sessionToken, visitorId } = useAnalytics();

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | undefined>();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('Dhaka');
  const [area, setArea] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online' | 'bkash'>('cod');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDeliveryZones()
      .then((z) => {
        setZones(z);
        if (z[0]) setSelectedZoneId(z[0].id);
      })
      .catch(() => undefined);

    trackEvent({ eventType: 'Checkout Started', pagePath: '/checkout' });
    apiFetch('/cart/checkout-intent', {
      method: 'POST',
      body: JSON.stringify({ checkoutStarted: true }),
    }).catch(() => undefined);
  }, [trackEvent]);

  const syncAbandonedLead = () => {
    if (!customerName && !customerPhone && !customerEmail) return;
    apiFetch('/cart/checkout-intent', {
      method: 'POST',
      body: JSON.stringify({
        customerName,
        customerPhone,
        customerEmail,
        checkoutStarted: true,
      }),
    }).catch(() => undefined);
  };

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];
  const subtotal = cart?.subtotal || 0;
  const discountAmount = cart?.discountAmount || 0;
  const netSubtotal = Math.max(0, subtotal - discountAmount);
  let deliveryCharge = selectedZone ? selectedZone.charge : 80;
  if (
    selectedZone?.freeShippingThreshold &&
    netSubtotal >= selectedZone.freeShippingThreshold
  ) {
    deliveryCharge = 0;
  }
  const finalTotal = netSubtotal + deliveryCharge;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || cart.items.length === 0) {
      setError('Your shopping bag is empty.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await apiFetch<{
        success: boolean;
        data: { order: { orderNumber: string } };
      }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
          deliveryAddress,
          city,
          area,
          postalCode,
          deliveryInstructions,
          deliveryZoneId: selectedZone?.id,
          paymentMethod,
          couponCode: cart.couponCode || undefined,
          cartSessionToken: getStoredCartToken(),
          analyticsSessionToken: sessionToken,
          visitorId,
          items: cart.items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('qayz_order_phone', customerPhone);
      }
      await refreshCart();
      router.push(
        `/orders/${res.data.order.orderNumber}?phone=${encodeURIComponent(customerPhone)}`
      );
    } catch (err) {
      setError((err as Error).message || 'Could not place order. Please review your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const pageBg =
    design === '3'
      ? 'bg-[#FAF5EB] text-[#241715]'
      : design === '2'
        ? 'bg-slate-50 text-slate-900'
        : 'bg-[#F8F6F1] text-[#111113]';

  const btnPrimary =
    design === '3'
      ? 'bg-[#5C1B24] hover:bg-[#47141B] text-white'
      : design === '2'
        ? 'bg-slate-900 hover:bg-slate-800 text-white rounded-lg'
        : 'bg-[#111113] hover:bg-neutral-800 text-white';

  if (!cart || cart.items.length === 0) {
    return (
      <div className={`${pageBg} min-h-[70vh] py-20 text-center px-4 space-y-4`}>
        <h1 className="font-serif text-3xl">Your Bag Is Empty</h1>
        <p className="text-sm opacity-70">Add a Panjabi to your bag before checking out.</p>
        <Link
          href="/products"
          className={`inline-block px-7 py-3 text-xs uppercase tracking-widest ${btnPrimary}`}
        >
          Browse Collection
        </Link>
      </div>
    );
  }

  return (
    <div className={`${pageBg} min-h-screen py-10 sm:py-14`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pb-6 border-b border-current/15 mb-8 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] opacity-60">Express Checkout</p>
            <h1 className="font-serif text-3xl mt-1">Complete Your Order</h1>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs opacity-70">
            <Lock className="w-3.5 h-3.5" /> Server-Verified Pricing & Stock
          </span>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left: Form */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white border border-current/15 p-6 space-y-5">
              <h2 className="font-serif text-xl border-b border-neutral-100 pb-3">
                1. Customer & Delivery Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium mb-1.5">
                    Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onBlur={syncAbandonedLead}
                    placeholder="e.g. Zahir Uddin"
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    required
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    onBlur={syncAbandonedLead}
                    placeholder="e.g. 01711-000000"
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-medium mb-1.5">
                  Email Address (Optional, for order receipt)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  onBlur={syncAbandonedLead}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-medium mb-1.5">
                  Street / House / Apartment Address *
                </label>
                <input
                  required
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="House 24, Road 7, Block C"
                  className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium mb-1.5">
                    City *
                  </label>
                  <input
                    required
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium mb-1.5">
                    Area / Thana *
                  </label>
                  <input
                    required
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Banani / Dhanmondi"
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium mb-1.5">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="1213"
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-medium mb-1.5">
                  Delivery Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="Call before arriving, leave with security guard, etc."
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            {/* Delivery Zone */}
            <div className="bg-white border border-current/15 p-6 space-y-4">
              <h2 className="font-serif text-xl border-b border-neutral-100 pb-3 flex items-center gap-2">
                <Truck className="w-5 h-5" /> 2. Delivery Speed & Zone
              </h2>
              <div className="space-y-3">
                {zones.map((z) => {
                  const selected = z.id === selectedZone?.id;
                  const qualifiesFree =
                    z.freeShippingThreshold && netSubtotal >= z.freeShippingThreshold;
                  return (
                    <label
                      key={z.id}
                      className={`flex items-center justify-between p-4 border cursor-pointer transition-colors ${selected
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-400'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="deliveryZone"
                          checked={selected}
                          onChange={() => setSelectedZoneId(z.id)}
                          className="accent-neutral-900"
                        />
                        <div>
                          <p className="text-sm font-medium">{z.name}</p>
                          <p className="text-xs text-neutral-500">
                            Est. {z.estimatedDays}
                            {z.freeShippingThreshold
                              ? ` · Free over ${formatBDT(z.freeShippingThreshold)}`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">
                        {qualifiesFree ? 'FREE' : formatBDT(z.charge)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Payment Method (Extensible Architecture) */}
            <div className="bg-white border border-current/15 p-6 space-y-4">
              <h2 className="font-serif text-xl border-b border-neutral-100 pb-3">
                3. Payment Method
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'cod' as const,
                    label: 'Cash on Delivery',
                    sub: 'Pay in cash at doorstep',
                    icon: Banknote,
                  },
                  {
                    id: 'bkash' as const,
                    label: 'bKash Mobile',
                    sub: 'Fast mobile settlement',
                    icon: Smartphone,
                  },
                  {
                    id: 'online' as const,
                    label: 'Online / Card',
                    sub: 'SSLCommerz Gateway Ready',
                    icon: CreditCard,
                  },
                ].map((pm) => {
                  const selected = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`p-4 border text-left transition-all ${selected
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 hover:border-neutral-400 bg-white'
                        }`}
                    >
                      <pm.icon className="w-5 h-5 mb-2" />
                      <p className="text-xs font-semibold uppercase tracking-wider">{pm.label}</p>
                      <p className={`text-[11px] mt-1 ${selected ? 'text-white/75' : 'text-neutral-500'}`}>
                        {pm.sub}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-current/15 p-6 space-y-5 sticky top-24">
              <h2 className="font-serif text-xl border-b border-neutral-100 pb-3">
                Order Summary
              </h2>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex gap-3 text-sm items-center">
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-14 h-18 object-cover bg-neutral-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.productName}</p>
                      <p className="text-xs text-neutral-500">
                        {item.color} · {item.size} × {item.quantity}
                      </p>
                    </div>
                    <span className="font-medium shrink-0">{formatBDT(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm border-t border-neutral-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Subtotal</span>
                  <span>{formatBDT(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount ({cart.couponCode})</span>
                    <span>-{formatBDT(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-600">Delivery Charge</span>
                  <span>{deliveryCharge === 0 ? 'Complimentary' : formatBDT(deliveryCharge)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-3 border-t border-neutral-200">
                  <span>Final Total</span>
                  <span>{formatBDT(finalTotal)}</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-4 text-xs uppercase tracking-[0.22em] font-semibold transition-colors disabled:opacity-50 ${btnPrimary}`}
              >
                {submitting ? 'Confirming Order…' : `Place Order · ${formatBDT(finalTotal)}`}
              </button>

              <p className="text-[11px] text-neutral-500 flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                7-Day Exchange Guarantee · Authentic QAYZ Tailoring
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

