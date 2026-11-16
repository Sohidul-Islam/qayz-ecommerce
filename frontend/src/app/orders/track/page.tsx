'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PackageSearch, ArrowRight } from 'lucide-react';
import { apiFetch, OrderDetail } from '@/lib/api';
import { useDesign } from '@/context/DesignContext';

export default function TrackOrderPage() {
  const router = useRouter();
  const { design } = useDesign();
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pageBg =
    design === '3'
      ? 'bg-[#FAF5EB] text-[#241715]'
      : design === '2'
        ? 'bg-slate-50 text-slate-900'
        : 'bg-[#F8F6F1] text-[#111113]';

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const qs = phone.trim() ? `?phone=${encodeURIComponent(phone.trim())}` : '';
      const res = await apiFetch<{ success: boolean; data: OrderDetail }>(
        `/orders/${encodeURIComponent(orderNumber.trim().toUpperCase())}${qs}`
      );
      router.push(`/orders/${res.data.orderNumber}`);
    } catch (err) {
      setError((err as Error).message || 'Could not locate order. Verify your Order ID and phone.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${pageBg} min-h-[75vh] py-16 px-4`}>
      <div className="max-w-lg mx-auto bg-white border border-current/15 p-8 space-y-6">
        <div className="space-y-2 text-center">
          <PackageSearch className="w-8 h-8 mx-auto opacity-80" />
          <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">
            Client Concierge
          </p>
          <h1 className="font-serif text-3xl">Track Your Order</h1>
          <p className="text-sm text-neutral-600">
            Enter your Order Number (e.g. <span className="font-mono">QYZ-202611-1001</span>) to view
            live dispatch & courier updates.
          </p>
        </div>

        <form onSubmit={handleLookup} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider font-medium mb-1.5">
              Order Number *
            </label>
            <input
              required
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="QYZ-202611-1001"
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-medium mb-1.5">
              Phone Number (Verification)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01711223344"
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-neutral-900 text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Track Order'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

