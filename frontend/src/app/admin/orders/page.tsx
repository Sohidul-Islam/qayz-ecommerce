'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Eye, X, Truck, Clock } from 'lucide-react';
import { OrderDetail, apiFetch } from '@/lib/api';
import { formatBDT, formatDateTime, getStatusBadgeClass } from '@/lib/utils';

const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Returned',
  'Refunded',
];

const DELIVERY_STATUSES = [
  'Pending',
  'Assigned',
  'Picked Up',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Failed',
  'Returned',
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');

  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [nextOrderStatus, setNextOrderStatus] = useState('Confirmed');
  const [nextPaymentStatus, setNextPaymentStatus] = useState('pending');
  const [statusNote, setStatusNote] = useState('');

  const [delStatus, setDelStatus] = useState('Pending');
  const [courierPartner, setCourierPartner] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estDate, setEstDate] = useState('');
  const [delNotes, setDelNotes] = useState('');

  const [internalNotes, setInternalNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (paymentFilter !== 'all') qs.set('paymentStatus', paymentFilter);
      if (deliveryFilter !== 'all') qs.set('deliveryStatus', deliveryFilter);
      const res = await apiFetch<{ success: boolean; data: OrderDetail[] }>(
        `/admin/orders?${qs.toString()}`,
        { isAdmin: true }
      );
      setOrders(res.data);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paymentFilter, deliveryFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const openDetail = async (id: number) => {
    const res = await apiFetch<{ success: boolean; data: OrderDetail }>(`/admin/orders/${id}`, {
      isAdmin: true,
    });
    const d = res.data;
    setSelectedOrder(d);
    setNextOrderStatus(d.orderStatus);
    setNextPaymentStatus(d.paymentStatus);
    setStatusNote('');
    setDelStatus(d.delivery?.deliveryStatus || d.deliveryStatus);
    setCourierPartner(d.delivery?.courierPartner || '');
    setTrackingNumber(d.delivery?.trackingNumber || '');
    setEstDate(d.delivery?.estimatedDeliveryDate || '');
    setDelNotes(d.delivery?.deliveryNotes || '');
    setInternalNotes(d.internalNotes || '');
  };

  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ success: boolean; data: OrderDetail }>(
        `/admin/orders/${selectedOrder.id}/status`,
        {
          method: 'PATCH',
          isAdmin: true,
          body: JSON.stringify({
            orderStatus: nextOrderStatus,
            paymentStatus: nextPaymentStatus,
            note: statusNote,
          }),
        }
      );
      setSelectedOrder(res.data);
      setStatusNote('');
      await loadOrders();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ success: boolean; data: OrderDetail }>(
        `/admin/orders/${selectedOrder.id}/delivery`,
        {
          method: 'PATCH',
          isAdmin: true,
          body: JSON.stringify({
            deliveryStatus: delStatus,
            courierPartner,
            trackingNumber,
            estimatedDeliveryDate: estDate,
            deliveryNotes: delNotes,
          }),
        }
      );
      setSelectedOrder(res.data);
      await loadOrders();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedOrder) return;
    await apiFetch(`/admin/orders/${selectedOrder.id}/notes`, {
      method: 'POST',
      isAdmin: true,
      body: JSON.stringify({ internalNotes }),
    });
    await openDetail(selectedOrder.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Order & Fulfillment Management</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Manage transitions with full status history and automatic stock restoration on cancellations or returns.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Order #, customer name, phone, area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-300 rounded"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-neutral-300 rounded"
        >
          <option value="all">All Order Statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-neutral-300 rounded"
        >
          <option value="all">All Payment Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <select
          value={deliveryFilter}
          onChange={(e) => setDeliveryFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-neutral-300 rounded"
        >
          <option value="all">All Delivery Statuses</option>
          {DELIVERY_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Order Status</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-neutral-400">
                    Loading orders…
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-50/70">
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold">{o.orderNumber}</p>
                      <p className="text-[10px] text-neutral-400">{formatDateTime(o.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{o.customerName}</p>
                      <p className="text-[11px] text-neutral-500">{o.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {o.area}, {o.city}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-medium ${getStatusBadgeClass(o.orderStatus)}`}>
                        {o.orderStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-medium ${getStatusBadgeClass(o.deliveryStatus)}`}>
                        {o.deliveryStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="uppercase text-[10px] font-medium mr-1.5">{o.paymentMethod}</span>
                      <span className={`px-2 py-0.5 rounded border text-[10px] capitalize ${getStatusBadgeClass(o.paymentStatus)}`}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatBDT(o.totalAmount)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openDetail(o.id)}
                        className="px-2.5 py-1 border border-neutral-300 rounded hover:bg-neutral-100 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg font-mono">{selectedOrder.orderNumber}</h2>
                <p className="text-xs text-neutral-500">
                  Placed {formatDateTime(selectedOrder.createdAt)} · Source: {selectedOrder.trafficSource}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)}><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Transition Form */}
                <form onSubmit={handleUpdateOrderStatus} className="bg-neutral-50 border border-neutral-200 p-4 rounded space-y-3">
                  <h3 className="font-bold text-sm">Order & Payment Status</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">Order Status</label>
                      <select
                        value={nextOrderStatus}
                        onChange={(e) => setNextOrderStatus(e.target.value)}
                        className="w-full px-2.5 py-2 border rounded bg-white"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Payment Status</label>
                      <select
                        value={nextPaymentStatus}
                        onChange={(e) => setNextPaymentStatus(e.target.value)}
                        className="w-full px-2.5 py-2 border rounded bg-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                  </div>
                  <input
                    placeholder="Transition note (recorded in immutable status history)"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="w-full px-2.5 py-2 border rounded bg-white"
                  />
                  {(nextOrderStatus === 'Cancelled' || nextOrderStatus === 'Returned') && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                      Setting status to {nextOrderStatus} will automatically restore ordered items to variant inventory.
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-neutral-900 text-white rounded font-medium hover:bg-neutral-800"
                  >
                    Update Order Status
                  </button>
                </form>

                {/* Delivery Form */}
                <form onSubmit={handleUpdateDelivery} className="bg-neutral-50 border border-neutral-200 p-4 rounded space-y-3">
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    <Truck className="w-4 h-4" /> Courier & Delivery Tracking
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">Delivery Status</label>
                      <select
                        value={delStatus}
                        onChange={(e) => setDelStatus(e.target.value)}
                        className="w-full px-2.5 py-2 border rounded bg-white"
                      >
                        {DELIVERY_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Courier Partner</label>
                      <input
                        value={courierPartner}
                        onChange={(e) => setCourierPartner(e.target.value)}
                        className="w-full px-2.5 py-2 border rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Tracking Number</label>
                      <input
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="w-full px-2.5 py-2 border rounded bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Estimated Date / ETA</label>
                      <input
                        value={estDate}
                        onChange={(e) => setEstDate(e.target.value)}
                        className="w-full px-2.5 py-2 border rounded bg-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-neutral-900 text-white rounded font-medium hover:bg-neutral-800"
                  >
                    Save Delivery Info
                  </button>
                </form>
              </div>

              {/* Customer + Items */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                <div>
                  <h4 className="font-bold uppercase text-[11px] text-neutral-500 mb-1.5">Customer</h4>
                  <p className="font-semibold">{selectedOrder.customerName}</p>
                  <p>{selectedOrder.customerPhone}</p>
                  {selectedOrder.customerEmail && <p>{selectedOrder.customerEmail}</p>}
                  <p className="mt-1 text-neutral-600">
                    {selectedOrder.deliveryAddress}, {selectedOrder.area}, {selectedOrder.city}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="font-bold uppercase text-[11px] text-neutral-500 mb-1.5">Items Ordered</h4>
                  <div className="border rounded divide-y">
                    {selectedOrder.items.map((it) => (
                      <div key={it.id} className="p-2.5 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{it.productName}</p>
                          <p className="text-[11px] text-neutral-500">
                            {it.variantColor} · {it.variantSize} · {it.variantSku} · Qty {it.quantity}
                          </p>
                        </div>
                        <span className="font-semibold">{formatBDT(it.lineTotal)}</span>
                      </div>
                    ))}
                    <div className="p-2.5 bg-neutral-50 flex justify-between font-bold">
                      <span>
                        Total (Subtotal {formatBDT(selectedOrder.subtotal)} - Discount {formatBDT(selectedOrder.discountAmount)} + Delivery {formatBDT(selectedOrder.deliveryCharge)})
                      </span>
                      <span>{formatBDT(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div className="border-t pt-4 space-y-2">
                <h4 className="font-bold uppercase text-[11px] text-neutral-500">Internal Admin Notes</h4>
                <div className="flex gap-2">
                  <input
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Private fulfillment or customer call notes..."
                    className="flex-1 px-3 py-2 border rounded"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-4 py-2 border border-neutral-900 rounded font-medium hover:bg-neutral-100"
                  >
                    Save Note
                  </button>
                </div>
              </div>

              {/* Status History */}
              <div className="border-t pt-4 space-y-2">
                <h4 className="font-bold uppercase text-[11px] text-neutral-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Immutable Status History
                </h4>
                <div className="space-y-2">
                  {selectedOrder.history.map((h) => (
                    <div key={h.id} className="flex justify-between items-center bg-neutral-50 p-2.5 rounded border">
                      <div>
                        <span className="font-semibold">{h.previousStatus || 'Created'} → {h.newStatus}</span>{' '}
                        <span className="text-[10px] text-neutral-500 uppercase">[{h.statusType}]</span>
                        <p className="text-neutral-600 mt-0.5">{h.note} (by {h.changedByName})</p>
                      </div>
                      <span className="text-neutral-400">{formatDateTime(h.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

