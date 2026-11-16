'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Users,
  Search,
  AlertCircle,
  Sparkles,
  TrendingDown,
  Globe,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatBDT } from '@/lib/utils';

interface AnalyticsReport {
  periodDays: number;
  traffic: {
    totalVisitors: number;
    uniqueVisitors: number;
    newVisitors: number;
    returningVisitors: number;
    totalPageViews: number;
    avgSessionDurationSeconds: number;
    devices: Array<{ device: string; count: number }>;
    browsers: Array<{ name: string; count: number }>;
    operatingSystems: Array<{ name: string; count: number }>;
    countries: Array<{ name: string; count: number }>;
    landingPages: Array<{ name: string; count: number }>;
    referrers: Array<{ name: string; count: number }>;
    trafficSources: Array<{
      source: string;
      visitors: number;
      productViews: number;
      addToCarts: number;
      checkouts: number;
      orders: number;
      revenue: number;
      conversionRate: number;
    }>;
    campaigns: Array<{ campaign: string; source: string; medium: string; visitors: number }>;
  };
  sales: {
    revenue: number;
    orders: number;
    completedOrders: number;
    avgOrderValue: number;
    conversionRate: number;
    cancellationRate: number;
    returnRate: number;
  };
  customers: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    repeatCustomers: number;
    repeatPurchaseRate: number;
    acquisitionSources: Array<{ name: string; count: number }>;
  };
  funnel: Array<{
    step: string;
    count: number;
    rateFromPrevious: number;
    overallRate: number;
  }>;
  products: {
    all: Array<{
      productId: number;
      name: string;
      category: string;
      views: number;
      avgDwellSeconds: number;
      addToCarts: number;
      purchases: number;
      revenue: number;
      addToCartRate: number;
      conversionRate: number;
      availableStock: number;
      salesVelocityPerDay: number;
      daysOfStockLeft: number;
      restockPriorityScore: number;
    }>;
    highViewsLowPurchases: Array<{
      productId: number;
      name: string;
      views: number;
      addToCarts: number;
      purchases: number;
      conversionRate: number;
    }>;
    mostAbandonedProducts: Array<{
      productId: number;
      name: string;
      abandonedCount: number;
      removals: number;
    }>;
    highestConversionProducts: Array<{
      productId: number;
      name: string;
      views: number;
      purchases: number;
      conversionRate: number;
    }>;
    lowestConversionProducts: Array<{
      productId: number;
      name: string;
      views: number;
      purchases: number;
      conversionRate: number;
    }>;
    popularCategories: Array<{
      category: string;
      views: number;
      addToCarts: number;
      purchases: number;
      revenue: number;
    }>;
    restockRecommendations: Array<{
      productId: number;
      name: string;
      availableStock: number;
      salesVelocityPerDay: number;
      views: number;
      addToCartRate: number;
      daysOfStockLeft: number;
      restockPriorityScore: number;
    }>;
  };
  search: {
    topKeywords: Array<{ query: string; count: number; zeroResultsCount: number }>;
    zeroResultSearches: Array<{ query: string; count: number; zeroResultsCount: number }>;
    productsClickedAfterSearch: number;
    ordersFromSearch: number;
  };
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ success: boolean; data: AnalyticsReport }>(`/admin/analytics?days=${days}`, {
      isAdmin: true,
    })
      .then((res) => setReport(res.data))
      .catch((err) => setError((err as Error).message));
  }, [days]);

  if (error) {
    return <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>;
  }

  if (!report) {
    return <div className="py-16 text-center text-sm text-neutral-500">Compiling Analytics Intelligence…</div>;
  }

  const maxFunnelCount = Math.max(1, report.funnel[0]?.count || 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Behavior, Funnel & Attribution Analytics
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Privacy-conscious customer journey tracking, UTM source ROI, search insights, and restock velocity.
          </p>
        </div>

        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 text-xs bg-white border border-neutral-300 rounded font-medium"
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      {/* Traffic & Sales KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Sessions', value: report.traffic.totalVisitors, sub: `${report.traffic.uniqueVisitors} unique visitors` },
          { label: 'New vs Returning', value: `${report.traffic.newVisitors} / ${report.traffic.returningVisitors}`, sub: `Avg session ${report.traffic.avgSessionDurationSeconds}s` },
          { label: 'Overall Conversion', value: `${report.sales.conversionRate}%`, sub: `${report.sales.completedOrders} completed orders` },
          { label: 'Repeat Purchase Rate', value: `${report.customers.repeatPurchaseRate}%`, sub: `${report.customers.repeatCustomers} repeat buyers` },
          { label: 'Cancel / Return Rate', value: `${report.sales.cancellationRate}% / ${report.sales.returnRate}%`, sub: `AOV ${formatBDT(report.sales.avgOrderValue)}` },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-neutral-200 rounded-lg p-4 space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">{k.label}</p>
            <p className="text-xl font-bold">{k.value}</p>
            <p className="text-[11px] text-neutral-500">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Funnel + Device & Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Customer Journey Funnel */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Customer Journey Conversion Funnel</h2>
            <p className="text-xs text-neutral-500">
              Pinpoints exactly where visitors drop off between landing and purchase.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {report.funnel.map((step, idx) => {
              const widthPct = Math.max(6, Math.round((step.count / maxFunnelCount) * 100));
              return (
                <div key={step.step} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">
                      {idx + 1}. {step.step}
                    </span>
                    <span className="text-neutral-600">
                      <b>{step.count}</b> · Step Conv: <b>{step.rateFromPrevious}%</b> · Overall:{' '}
                      <b>{step.overallRate}%</b>
                    </span>
                  </div>
                  <div className="h-6 bg-neutral-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-neutral-900 rounded flex items-center px-2 text-[10px] text-white font-medium"
                      style={{ width: `${widthPct}%` }}
                    >
                      {step.overallRate}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Devices & UTM Campaigns */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Visitor Devices
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              {report.traffic.devices.map((d) => (
                <div key={d.device} className="bg-neutral-50 border border-neutral-200 rounded p-3">
                  <p className="text-lg font-bold">{d.count}</p>
                  <p className="text-xs text-neutral-500">{d.device}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> Active UTM Campaigns
            </h2>
            <div className="space-y-2 text-xs">
              {report.traffic.campaigns.length === 0 ? (
                <p className="text-neutral-500">No tagged UTM campaigns recorded yet.</p>
              ) : (
                report.traffic.campaigns.map((c) => (
                  <div key={`${c.campaign}-${c.source}`} className="flex justify-between items-center py-1.5 border-b border-neutral-100 last:border-b-0">
                    <div>
                      <p className="font-mono font-semibold">{c.campaign}</p>
                      <p className="text-[11px] text-neutral-500">{c.source} · {c.medium}</p>
                    </div>
                    <span className="font-bold">{c.visitors} visits</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Marketing Source Attribution Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
          <h2 className="text-sm font-semibold">Marketing Source Attribution (Where Customers Come From)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b text-neutral-500 uppercase">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Visitors</th>
                <th className="px-4 py-3 text-right">Product Views</th>
                <th className="px-4 py-3 text-right">Add to Carts</th>
                <th className="px-4 py-3 text-right">Checkouts</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Conv. Rate</th>
                <th className="px-4 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {report.traffic.trafficSources.map((ts) => (
                <tr key={ts.source}>
                  <td className="px-4 py-3 font-semibold">{ts.source}</td>
                  <td className="px-4 py-3 text-right">{ts.visitors}</td>
                  <td className="px-4 py-3 text-right">{ts.productViews}</td>
                  <td className="px-4 py-3 text-right">{ts.addToCarts}</td>
                  <td className="px-4 py-3 text-right">{ts.checkouts}</td>
                  <td className="px-4 py-3 text-right font-semibold">{ts.orders}</td>
                  <td className="px-4 py-3 text-right">{ts.conversionRate}%</td>
                  <td className="px-4 py-3 text-right font-bold">{formatBDT(ts.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Intelligence: Leaks + Restock Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Views, Low Purchases */}
        <div className="bg-white border border-amber-200 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-amber-600" />
            High Views · Low Purchases (Conversion Leak Detector)
          </h2>
          <p className="text-xs text-neutral-500">
            Products drawing high attention but underperforming on final purchase conversion.
          </p>
          <div className="divide-y divide-neutral-100 text-xs">
            {report.products.highViewsLowPurchases.length === 0 ? (
              <p className="text-neutral-500 py-3">All high-traffic products are converting well.</p>
            ) : (
              report.products.highViewsLowPurchases.map((p) => (
                <div key={p.productId} className="py-2.5 flex justify-between items-center gap-3">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-[11px] text-neutral-500">
                      {p.views} views · {p.addToCarts} carts · {p.purchases} purchases
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-semibold">
                    {p.conversionRate}% conv
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Restock Intelligence */}
        <div className="bg-white border border-emerald-200 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            Smart Restock Recommendations
          </h2>
          <p className="text-xs text-neutral-500">
            Ranked by sales velocity, add-to-cart rate, product views, and remaining stock buffer.
          </p>
          <div className="divide-y divide-neutral-100 text-xs">
            {report.products.restockRecommendations.map((r) => (
              <div key={r.productId} className="py-2.5 flex justify-between items-center gap-3">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-[11px] text-neutral-500">
                    {r.availableStock} left · Velocity: {r.salesVelocityPerDay}/day · Cart rate: {r.addToCartRate}%
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-semibold">
                  Priority {r.restockPriorityScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Behavior Matrix */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
          <h2 className="text-sm font-semibold">Product Popularity & Dwell Matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b text-neutral-500 uppercase">
              <tr>
                <th className="px-4 py-3">Punjabi</th>
                <th className="px-4 py-3 text-right">Views</th>
                <th className="px-4 py-3 text-right">Avg Time</th>
                <th className="px-4 py-3 text-right">Add to Cart</th>
                <th className="px-4 py-3 text-right">Cart Rate</th>
                <th className="px-4 py-3 text-right">Purchases</th>
                <th className="px-4 py-3 text-right">Conv Rate</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {report.products.all.map((pm) => (
                <tr key={pm.productId}>
                  <td className="px-4 py-3 font-medium">{pm.name}</td>
                  <td className="px-4 py-3 text-right">{pm.views}</td>
                  <td className="px-4 py-3 text-right text-neutral-500">{pm.avgDwellSeconds}s</td>
                  <td className="px-4 py-3 text-right">{pm.addToCarts}</td>
                  <td className="px-4 py-3 text-right">{pm.addToCartRate}%</td>
                  <td className="px-4 py-3 text-right font-semibold">{pm.purchases}</td>
                  <td className="px-4 py-3 text-right">{pm.conversionRate}%</td>
                  <td className="px-4 py-3 text-right">{pm.availableStock}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatBDT(pm.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Search Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Search className="w-4 h-4" /> Top Customer Search Keywords
            </h2>
            <span className="text-[11px] text-neutral-500">
              {report.search.productsClickedAfterSearch} views · {report.search.ordersFromSearch} orders from search
            </span>
          </div>
          <div className="divide-y divide-neutral-100 text-xs">
            {report.search.topKeywords.map((sk) => (
              <div key={sk.query} className="py-2 flex justify-between items-center">
                <span className="font-medium">“{sk.query}”</span>
                <span className="text-neutral-600">{sk.count} searches</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-rose-200 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-semibold text-rose-900 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600" /> Searches Returning Zero Results
          </h2>
          <p className="text-xs text-neutral-500">
            Unmet customer demand — consider adding these styles to upcoming batches.
          </p>
          <div className="divide-y divide-neutral-100 text-xs">
            {report.search.zeroResultSearches.map((zs) => (
              <div key={zs.query} className="py-2 flex justify-between items-center">
                <span className="font-semibold text-rose-800">“{zs.query}”</span>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded">
                  {zs.zeroResultsCount} missed searches
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Popularity, Abandoned Products & Environment Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-semibold">Most Popular Categories</h2>
          <div className="divide-y divide-neutral-100 text-xs">
            {report.products.popularCategories.map((c) => (
              <div key={c.category} className="py-2 flex justify-between items-center gap-2">
                <span className="font-medium truncate">{c.category}</span>
                <span className="text-neutral-600 shrink-0">
                  {c.views} views · {c.purchases} sold
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-semibold">Most Abandoned & Removed Products</h2>
          <div className="divide-y divide-neutral-100 text-xs">
            {report.products.mostAbandonedProducts.map((p) => (
              <div key={p.productId} className="py-2 flex justify-between items-center gap-2">
                <span className="font-medium truncate">{p.name}</span>
                <span className="text-amber-700 font-semibold shrink-0">
                  {p.abandonedCount} in abandoned · {p.removals} removed
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-semibold">Browsers, OS, Regions & Acquisition</h2>
          <div className="space-y-2 text-xs">
            <p className="text-neutral-600">
              <b>Browsers:</b>{' '}
              {report.traffic.browsers.map((b) => `${b.name} (${b.count})`).join(', ')}
            </p>
            <p className="text-neutral-600">
              <b>OS:</b>{' '}
              {report.traffic.operatingSystems.map((o) => `${o.name} (${o.count})`).join(', ')}
            </p>
            <p className="text-neutral-600">
              <b>Regions:</b>{' '}
              {report.traffic.countries.map((c) => `${c.name} (${c.count})`).join(', ')}
            </p>
            <p className="text-neutral-600">
              <b>Top Landing Pages:</b>{' '}
              {report.traffic.landingPages.slice(0, 4).map((l) => `${l.name} (${l.count})`).join(', ')}
            </p>
            <p className="text-neutral-600">
              <b>Customer Sources:</b>{' '}
              {report.customers.acquisitionSources.map((a) => `${a.name} (${a.count})`).join(', ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

