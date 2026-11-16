'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle2, Package, Truck, MapPin, CreditCard, Clock, ArrowRight } from 'lucide-react';
import { OrderDetail, apiFetch } from '@/lib/api';
import { formatBDT, formatDateTime, getStatusBadgeClass } from '@/lib/utils';
import { useDesign } from '@/context/DesignContext';

const MILESTONES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderNumber = String(params.orderNumber);
  const { design } = useDesign();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ success: boolean; data: OrderDetail }>(`/orders/${orderNumber}`)
      .then((res) => setOrder(res.data))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  const pageBg =
    design === '3'
      ? 'bg-[#FAF5EB] text-[#241715]'
      : design === '2'
        ? 'bg-slate-50 text-slate-900'
        : 'bg-[#F8F6F1] text-[#111113]';

  if (loading) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-serif text-3xl">Order Not Found</h1>
        <p className="text-sm text-neutral-600">{error}</p>
        <Link href="/orders/track" className="inline-block px-6 py-3 bg-neutral-900 text-white text-xs uppercase tracking-widest">
          Try Tracking Lookup
        </Link>
      </div>
    );
  }

  const activeIdx = MILESTONES.indexOf(order.orderStatus);
  const isTerminalIssue = ['Cancelled', 'Returned', 'Refunded'].includes(order.orderStatus);

  return (
    <div className={`${pageBg} min-h-screen py-12`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Confirmation Banner */}
        <div className="bg-white border border-current/15 p-7 sm:p-9 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <CheckCircle2 className="w-8 h-8 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                  Order Confirmation & Live Status
                </p>
                <h1 className="font-serif text-2xl sm:text-3xl mt-0.5">
                  Thank you, {order.customerName}
                </h1>
                <p className="text-sm text-neutral-600 mt-1">
                  Order Reference: <span className="font-mono font-semibold text-neutral-900">{order.orderNumber}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 text-xs font-semibold border ${getStatusBadgeClass(order.orderStatus)}`}>
                Order: {order.orderStatus}
              </span>
              <span className={`px-3 py-1 text-xs font-semibold border ${getStatusBadgeClass(order.deliveryStatus)}`}>
                Delivery: {order.deliveryStatus}
              </span>
            </div>
          </div>

          {/* Progress Stepper */}
          {!isTerminalIssue && (
            <div className="pt-6 border-t border-neutral-100">
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                {MILESTONES.map((step, idx) => {
                  const done = activeIdx >= idx;
                  return (
                    <div key={step} className="text-center space-y-1.5">
                      <div
                        className={`h-1.5 w-full ${
                          done ? 'bg-emerald-700' : 'bg-neutral-200'
                        }`}
                      />
                      <p className={`text-[10px] uppercase tracking-wider ${done ? 'font-semibold text-neutral-900' : 'text-neutral-400'}`}>
                        {step}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-current/15 p-5 space-y-2 text-sm">
            <p className="text-xs uppercase tracking-widest text-neutral-500 flex items-center gap-1.5 font-semibold">
              <MapPin className="w-3.5 h-3.5" /> Delivery Address
            </p>
            <p className="font-medium">{order.customerName}</p>
            <p className="text-neutral-600">{order.customerPhone}</p>
            <p className="text-neutral-600">
              {order.deliveryAddress}, {order.area}, {order.city} {order.postalCode}
            </p>
          </div>

          <div className="bg-white border border-current/15 p-5 space-y-2 text-sm">
            <p className="text-xs uppercase tracking-widest text-neutral-500 flex items-center gap-1.5 font-semibold">
              <Truck className="w-3.5 h-3.5" /> Courier & Estimate
            </p>
            <p className="font-medium">{order.delivery?.courierPartner || 'QAYZ Express Courier'}</p>
            <p className="text-neutral-600">
              Tracking ID: <span className="font-mono">{order.delivery?.trackingNumber || 'Pending'}</span>
            </p>
            <p className="text-neutral-600">
              Expected: {order.delivery?.estimatedDeliveryDate || '2-3 Business Days'}
            </p>
          </div>

          <div className="bg-white border border-current/15 p-5 space-y-2 text-sm">
            <p className="text-xs uppercase tracking-widest text-neutral-500 flex items-center gap-1.5 font-semibold">
              <CreditCard className="w-3.5 h-3.5" /> Payment Summary
            </p>
            <p className="font-medium uppercase">{order.paymentMethod}</p>
            <p className="text-neutral-600 capitalize">Status: {order.paymentStatus}</p>
            <p className="text-base font-semibold pt-1">Total: {formatBDT(order.totalAmount)}</p>
          </div>
        </div>

        {/* Ordered Items */}
        <div className="bg-white border border-current/15 p-6 space-y-4">
          <h2 className="font-serif text-xl flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Package className="w-5 h-5" /> Ordered Panjabis
          </h2>
          <div className="divide-y divide-neutral-100">
            {order.items.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-4">
                  <img
                    src={item.imageUrl || '/images/products/punjabi-zafar-obsidian.png'}
                    alt={item.productName}
                    className="w-14 h-18 object-cover bg-neutral-100"
                  />
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-neutral-500">
                      {item.variantColor} · Size {item.variantSize} · Qty {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="font-semibold">{formatBDT(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-200 pt-4 space-y-1.5 text-sm max-w-xs ml-auto">
            <div className="flex justify-between">
              <span className="text-neutral-600">Subtotal</span>
              <span>{formatBDT(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span>-{formatBDT(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-neutral-600">Delivery</span>
              <span>{order.deliveryCharge === 0 ? 'Complimentary' : formatBDT(order.deliveryCharge)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-2 border-t border-neutral-200">
              <span>Total</span>
              <span>{formatBDT(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Status Transition History */}
        <div className="bg-white border border-current/15 p-6 space-y-4">
          <h2 className="font-serif text-xl flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Clock className="w-5 h-5" /> Order Timeline
          </h2>
          <div className="space-y-3">
            {order.history.map((h) => (
              <div key={h.id} className="flex items-start justify-between gap-4 text-sm border-l-2 border-neutral-900 pl-4 py-1">
                <div>
                  <p className="font-medium">
                    {h.newStatus}{' '}
                    <span className="text-[11px] uppercase tracking-wider text-neutral-400">
                      ({h.statusType})
                    </span>
                  </p>
                  <p className="text-xs text-neutral-600">{h.note}</p>
                </div>
                <span className="text-xs text-neutral-500 shrink-0">
                  {formatDateTime(h.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-neutral-900 text-white text-xs uppercase tracking-widest hover:bg-neutral-800"
          >
            Continue Browsing Collection <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
