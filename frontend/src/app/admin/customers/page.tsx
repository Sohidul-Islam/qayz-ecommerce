'use client';

import React, { useEffect, useState } from 'react';
import { Users, ShoppingCart } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatBDT, formatDateShort, formatDateTime } from '@/lib/utils';

interface CustomerRow {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  totalOrders: number;
  totalSpent: number;
  firstSource: string;
  createdAt: string;
}

interface AbandonedCartRow {
  cartId: number;
  sessionToken: string;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  checkoutStarted: boolean;
  lastActivityAt: string;
  createdAt: string;
  itemsCount: number;
  cartValue: number;
  items: Array<{ productName: string; color: string; size: string; quantity: number }>;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCartRow[]>([]);
  const [tab, setTab] = useState<'customers' | 'abandoned'>('customers');

  useEffect(() => {
    apiFetch<{ success: boolean; data: CustomerRow[] }>('/admin/customers', { isAdmin: true })
      .then((res) => setCustomers(res.data))
      .catch(() => undefined);

    apiFetch<{ success: boolean; data: AbandonedCartRow[] }>('/admin/abandoned-carts', {
      isAdmin: true,
    })
      .then((res) => setAbandonedCarts(res.data))
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers & Abandoned Carts</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Track repeat buyers, acquisition sources, and incomplete shopping carts.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('customers')}
            className={`px-4 py-2 text-xs font-medium rounded border inline-flex items-center gap-1.5 ${tab === 'customers' ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-300'
              }`}
          >
            <Users className="w-3.5 h-3.5" /> Customers ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('abandoned')}
            className={`px-4 py-2 text-xs font-medium rounded border inline-flex items-center gap-1.5 ${tab === 'abandoned' ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-300'
              }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Abandoned Carts ({abandonedCarts.length})
          </button>
        </div>
      </div>

      {tab === 'customers' ? (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 border-b text-neutral-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone / Email</th>
                  <th className="px-4 py-3">Acquisition Source</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Total Spent</th>
                  <th className="px-4 py-3">First Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-semibold">{c.name}</td>
                    <td className="px-4 py-3">
                      <p>{c.phone}</p>
                      {c.email && <p className="text-neutral-500">{c.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-neutral-100 rounded text-[11px] font-medium">
                        {c.firstSource}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{c.totalOrders}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatBDT(c.totalSpent)}</td>
                    <td className="px-4 py-3 text-neutral-500">{formatDateShort(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 border-b text-neutral-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Cart ID</th>
                  <th className="px-4 py-3">Products in Cart</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3">Checkout Started</th>
                  <th className="px-4 py-3">Voluntary Contact</th>
                  <th className="px-4 py-3">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {abandonedCarts.map((ac) => (
                  <tr key={ac.cartId}>
                    <td className="px-4 py-3 font-mono">
                      #{ac.cartId}
                      <p className="text-[10px] text-neutral-400">{ac.sessionToken.slice(0, 14)}…</p>
                    </td>
                    <td className="px-4 py-3">
                      {ac.items.map((it, idx) => (
                        <p key={idx}>
                          <b>{it.quantity}×</b> {it.productName} ({it.color}, {it.size})
                        </p>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{formatBDT(ac.cartValue)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${ac.checkoutStarted
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-neutral-100 text-neutral-600'
                          }`}
                      >
                        {ac.checkoutStarted ? 'Checkout Started' : 'Cart Stage'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ac.customerName || ac.customerPhone || ac.customerEmail ? (
                        <div>
                          <p className="font-medium">{ac.customerName}</p>
                          <p className="text-neutral-500">{ac.customerPhone || ac.customerEmail}</p>
                        </div>
                      ) : (
                        <span className="text-neutral-400">Anonymous Visitor</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{formatDateTime(ac.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

