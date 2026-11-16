'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Boxes, History, Sliders, Search, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

interface InventoryRow {
  inventoryId: number;
  variantId: number;
  productId: number;
  productName: string;
  sku: string;
  color: string;
  colorHex: string;
  size: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  soldQuantity: number;
  lowStockThreshold: number;
}

interface InventoryTx {
  id: number;
  changeAmount: number;
  previousStock: number;
  newStock: number;
  reason: string;
  note: string;
  createdAt: string;
}

export default function AdminInventoryPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [adjustRow, setAdjustRow] = useState<InventoryRow | null>(null);
  const [changeAmount, setChangeAmount] = useState<number>(10);
  const [reason, setReason] = useState<string>('Purchase/Restock');
  const [note, setNote] = useState('');
  const [threshold, setThreshold] = useState<number>(5);
  const [adjustError, setAdjustError] = useState('');

  const [txRow, setTxRow] = useState<InventoryRow | null>(null);
  const [txList, setTxList] = useState<InventoryTx[]>([]);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filter !== 'all') qs.set('filter', filter);
      if (search.trim()) qs.set('search', search.trim());
      const res = await apiFetch<{ success: boolean; data: InventoryRow[] }>(
        `/admin/inventory?${qs.toString()}`,
        { isAdmin: true }
      );
      setRows(res.data);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const openAdjust = (r: InventoryRow) => {
    setAdjustRow(r);
    setChangeAmount(10);
    setReason('Purchase/Restock');
    setNote('');
    setThreshold(r.lowStockThreshold);
    setAdjustError('');
  };

  const submitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustRow) return;
    setAdjustError('');
    try {
      await apiFetch(`/admin/inventory/${adjustRow.variantId}`, {
        method: 'PATCH',
        isAdmin: true,
        body: JSON.stringify({
          changeAmount: Number(changeAmount),
          lowStockThreshold: Number(threshold),
          reason,
          note,
        }),
      });
      setAdjustRow(null);
      await loadInventory();
    } catch (err) {
      setAdjustError((err as Error).message);
    }
  };

  const openHistory = async (r: InventoryRow) => {
    setTxRow(r);
    const res = await apiFetch<{ success: boolean; data: InventoryTx[] }>(
      `/admin/inventory/${r.variantId}/transactions`,
      { isAdmin: true }
    );
    setTxList(res.data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6" /> Variant Inventory Control
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Track Current, Available, Reserved, and Sold stock across every color and size with full audit ledger.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SKU or product…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-neutral-300 rounded"
            />
          </div>
          {(['all', 'low_stock', 'out_of_stock'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded border ${
                filter === f
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white border-neutral-300 text-neutral-700'
              }`}
            >
              {f === 'all' ? 'All SKUs' : f === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Punjabi & Variant</th>
                <th className="px-4 py-3 text-right">Current</th>
                <th className="px-4 py-3 text-right">Reserved</th>
                <th className="px-4 py-3 text-right">Available</th>
                <th className="px-4 py-3 text-right">Sold</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-neutral-400">
                    Loading inventory…
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const isOut = r.availableStock <= 0;
                  const isLow = !isOut && r.availableStock <= r.lowStockThreshold;
                  return (
                    <tr key={r.variantId} className="hover:bg-neutral-50/70">
                      <td className="px-4 py-3 font-mono font-medium">{r.sku}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-neutral-900">{r.productName}</p>
                        <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/20"
                            style={{ backgroundColor: r.colorHex }}
                          />
                          {r.color} · Size {r.size}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{r.currentStock}</td>
                      <td className="px-4 py-3 text-right text-neutral-500">{r.reservedStock}</td>
                      <td className="px-4 py-3 text-right font-bold">{r.availableStock}</td>
                      <td className="px-4 py-3 text-right text-neutral-600">{r.soldQuantity}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isOut
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isLow
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Healthy'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openAdjust(r)}
                          className="px-2.5 py-1 border border-neutral-300 rounded hover:bg-neutral-100 inline-flex items-center gap-1"
                        >
                          <Sliders className="w-3 h-3" /> Adjust
                        </button>
                        <button
                          type="button"
                          onClick={() => openHistory(r)}
                          className="px-2.5 py-1 border border-neutral-300 rounded hover:bg-neutral-100 inline-flex items-center gap-1"
                        >
                          <History className="w-3 h-3" /> Ledger
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustRow && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Adjust Inventory Stock</h2>
              <button type="button" onClick={() => setAdjustRow(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="text-xs bg-neutral-50 p-3 rounded border border-neutral-200">
              <p className="font-semibold">{adjustRow.productName}</p>
              <p className="text-neutral-600 mt-0.5">
                {adjustRow.color} · Size {adjustRow.size} ({adjustRow.sku}) · Current Stock:{' '}
                <b>{adjustRow.currentStock}</b>
              </p>
            </div>

            {adjustError && <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded">{adjustError}</p>}

            <form onSubmit={submitAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">
                  Quantity Change (+ to restock, - to deduct)
                </label>
                <input
                  required
                  type="number"
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Resulting Stock: <b>{adjustRow.currentStock + Number(changeAmount || 0)}</b>
                </p>
              </div>
              <div>
                <label className="block font-medium mb-1">Movement Reason *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="Purchase/Restock">Purchase/Restock</option>
                  <option value="Manual Adjustment">Manual Adjustment</option>
                  <option value="Return">Return</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Initial Stock">Initial Stock</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Low-Stock Alert Threshold</label>
                <input
                  type="number"
                  min={0}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Note</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Batch # or reason details"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAdjustRow(null)} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-neutral-900 text-white rounded font-medium">
                  Record Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {txRow && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">Inventory Ledger · {txRow.sku}</h2>
                <p className="text-xs text-neutral-500">{txRow.productName}</p>
              </div>
              <button type="button" onClick={() => setTxRow(null)}><X className="w-5 h-5" /></button>
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 border-b text-neutral-500">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Reason</th>
                    <th className="py-2 px-3 text-right">Change</th>
                    <th className="py-2 px-3 text-right">Stock</th>
                    <th className="py-2 px-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {txList.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2 px-3 text-neutral-500">{formatDateTime(tx.createdAt)}</td>
                      <td className="py-2 px-3 font-medium">{tx.reason}</td>
                      <td
                        className={`py-2 px-3 text-right font-bold ${
                          tx.changeAmount > 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {tx.changeAmount > 0 ? `+${tx.changeAmount}` : tx.changeAmount}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {tx.previousStock} → <b>{tx.newStock}</b>
                      </td>
                      <td className="py-2 px-3 text-neutral-600">{tx.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
