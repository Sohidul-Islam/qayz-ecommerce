'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  AlertTriangle,
  PackageCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatBDT, formatDateShort, getStatusBadgeClass } from '@/lib/utils';

interface DashboardData {
  kpis: {
    totalOrders: number;
    todaysOrders: number;
    weekOrders: number;
    monthOrders: number;
    totalRevenue: number;
    todaysRevenue: number;
    avgOrderValue: number;
    totalCustomers: number;
    newCustomers: number;
    pendingOrders: number;
    processingOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  charts: {
    salesOverTime: Array<{ date: string; revenue: number; orders: number }>;
    bestSellingProducts: Array<{ productId: number; name: string; unitsSold: number; revenue: number }>;
    categoryPerformance: Array<{ category: string; unitsSold: number; revenue: number }>;
  };
  alerts: {
    lowStockItems: Array<{
      variantId: number;
      sku: string;
      productName: string;
      color: string;
      size: string;
      availableStock: number;
      lowStockThreshold: number;
    }>;
    outOfStockItems: Array<{
      variantId: number;
      sku: string;
      productName: string;
      color: string;
      size: string;
      availableStock: number;
    }>;
  };
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    orderStatus: string;
    paymentStatus: string;
    createdAt: string;
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ success: boolean; data: DashboardData }>('/admin/dashboard', { isAdmin: true })
      .then((res) => setData(res.data))
      .catch((err) => setError((err as Error).message));
  }, []);

  if (error) {
    return <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 text-sm">{error}</div>;
  }

  if (!data) {
    return (
      <div className="py-16 text-center text-sm text-neutral-500">Loading Executive Dashboard…</div>
    );
  }

  const { kpis, charts, alerts, recentOrders } = data;
  const maxDailyRev = Math.max(1, ...charts.salesOverTime.map((d) => d.revenue));
  const maxDailyOrders = Math.max(1, ...charts.salesOverTime.map((d) => d.orders));
  const maxCatRev = Math.max(1, ...charts.categoryPerformance.map((c) => c.revenue));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time order velocity, revenue performance, and variant inventory health.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/analytics"
            className="px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded hover:bg-neutral-800 inline-flex items-center gap-1.5"
          >
            Deep Analytics & Funnel <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Total Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold">{formatBDT(kpis.totalRevenue)}</p>
          <p className="text-xs text-neutral-500">
            Today: <span className="font-semibold text-neutral-800">{formatBDT(kpis.todaysRevenue)}</span> ·
            AOV: <span className="font-semibold text-neutral-800">{formatBDT(kpis.avgOrderValue)}</span>
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold">{kpis.totalOrders}</p>
          <p className="text-xs text-neutral-500">
            Today: <b>{kpis.todaysOrders}</b> · Week: <b>{kpis.weekOrders}</b> · Month: <b>{kpis.monthOrders}</b>
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Customer Base</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold">{kpis.totalCustomers}</p>
          <p className="text-xs text-neutral-500">
            New This Month: <span className="font-semibold text-emerald-700">+{kpis.newCustomers}</span>
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Stock Attention</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold">
            {kpis.lowStockCount + kpis.outOfStockCount}{' '}
            <span className="text-sm font-normal text-neutral-500">variants</span>
          </p>
          <p className="text-xs text-neutral-500">
            Low Stock: <b className="text-amber-700">{kpis.lowStockCount}</b> · Out of Stock:{' '}
            <b className="text-rose-700">{kpis.outOfStockCount}</b>
          </p>
        </div>
      </div>

      {/* Order Fulfillment Pipeline Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending Orders', value: kpis.pendingOrders, cls: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
          { label: 'Processing / In Transit', value: kpis.processingOrders, cls: 'text-sky-700 bg-sky-50 border-sky-200', icon: ShoppingBag },
          { label: 'Delivered Orders', value: kpis.deliveredOrders, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: PackageCheck },
          { label: 'Cancelled Orders', value: kpis.cancelledOrders, cls: 'text-rose-700 bg-rose-50 border-rose-200', icon: AlertTriangle },
        ].map((st) => (
          <div key={st.label} className={`border rounded-lg p-4 flex items-center justify-between ${st.cls}`}>
            <div>
              <p className="text-xs font-medium opacity-80">{st.label}</p>
              <p className="text-xl font-bold mt-0.5">{st.value}</p>
            </div>
            <st.icon className="w-5 h-5 opacity-70" />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales / Revenue Over Time Chart */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Sales & Revenue Over Time (14d)</h2>
            <p className="text-xs text-neutral-500">Daily gross revenue (BDT)</p>
          </div>

          <div className="h-48 flex items-end gap-1.5 pt-4">
            {charts.salesOverTime.map((pt) => {
              const heightPct = Math.max(4, Math.round((pt.revenue / maxDailyRev) * 100));
              return (
                <div key={pt.date} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-neutral-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                    {pt.date}: {formatBDT(pt.revenue)}
                  </div>
                  <div className="w-full bg-neutral-100 rounded-t h-36 flex items-end overflow-hidden">
                    <div
                      className="w-full bg-neutral-900 group-hover:bg-amber-600 transition-colors rounded-t"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {pt.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Orders Over Time Chart */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Orders Over Time (14d)</h2>
            <p className="text-xs text-neutral-500">Daily order volume across all statuses</p>
          </div>

          <div className="h-48 flex items-end gap-1.5 pt-4">
            {charts.salesOverTime.map((pt) => {
              const heightPct = pt.orders > 0 ? Math.max(10, Math.round((pt.orders / maxDailyOrders) * 100)) : 3;
              return (
                <div key={`${pt.date}-ord`} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-neutral-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                    {pt.date}: {pt.orders} order(s)
                  </div>
                  <div className="w-full bg-sky-50 rounded-t h-36 flex items-end overflow-hidden">
                    <div
                      className="w-full bg-sky-700 group-hover:bg-sky-500 transition-colors rounded-t"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {pt.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Performance */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold">Category Performance</h2>
          <div className="space-y-3.5">
            {charts.categoryPerformance.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium truncate pr-2">{cat.category}</span>
                  <span className="text-neutral-600 shrink-0">
                    {formatBDT(cat.revenue)} ({cat.unitsSold} pcs)
                  </span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 rounded-full"
                    style={{ width: `${Math.round((cat.revenue / maxCatRev) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Tables: Best Selling + Stock Alerts + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Best-Selling Panjabis</h2>
            <Link href="/admin/products" className="text-xs text-neutral-600 hover:underline">
              Manage Catalog
            </Link>
          </div>
          <div className="divide-y divide-neutral-100 text-xs">
            {charts.bestSellingProducts.map((bp) => (
              <div key={bp.productId} className="py-2.5 flex justify-between items-center gap-3">
                <span className="font-medium truncate">{bp.name}</span>
                <div className="text-right shrink-0">
                  <p className="font-semibold">{formatBDT(bp.revenue)}</p>
                  <p className="text-[11px] text-neutral-500">{bp.unitsSold} sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-neutral-600 hover:underline">
              All Orders →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 font-medium">Order</th>
                  <th className="py-2 font-medium">Customer</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2.5 font-mono font-medium">{o.orderNumber}</td>
                    <td className="py-2.5">
                      <p className="font-medium">{o.customerName}</p>
                      <p className="text-[11px] text-neutral-400">{formatDateShort(o.createdAt)}</p>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 border rounded text-[11px] font-medium ${getStatusBadgeClass(o.orderStatus)}`}>
                        {o.orderStatus}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold">{formatBDT(o.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Low Stock & Out of Stock Alerts */}
      {(alerts.outOfStockItems.length > 0 || alerts.lowStockItems.length > 0) && (
        <div className="bg-white border border-amber-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Inventory Replenishment Alerts
            </h2>
            <Link href="/admin/inventory" className="text-xs font-medium text-amber-800 hover:underline">
              Restock Variants →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {alerts.outOfStockItems.map((item) => (
              <div key={item.variantId} className="p-3 bg-rose-50 border border-rose-200 rounded">
                <p className="font-semibold text-rose-900 truncate">{item.productName}</p>
                <p className="text-rose-700 mt-0.5">
                  {item.color} · Size {item.size} ({item.sku})
                </p>
                <p className="font-bold text-rose-800 mt-1">OUT OF STOCK (0 left)</p>
              </div>
            ))}
            {alerts.lowStockItems.map((item) => (
              <div key={item.variantId} className="p-3 bg-amber-50 border border-amber-200 rounded">
                <p className="font-semibold text-amber-900 truncate">{item.productName}</p>
                <p className="text-amber-700 mt-0.5">
                  {item.color} · Size {item.size} ({item.sku})
                </p>
                <p className="font-bold text-amber-800 mt-1">
                  Low Stock: {item.availableStock} left (Threshold: {item.lowStockThreshold})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

