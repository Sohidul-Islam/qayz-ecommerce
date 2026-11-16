'use client';

import React, { useEffect, useState } from 'react';
import { Truck, Plus, Edit3, X } from 'lucide-react';
import { DeliveryZone, OrderDetail, apiFetch } from '@/lib/api';
import { formatBDT, getStatusBadgeClass, slugify } from '@/lib/utils';

export default function AdminDeliveryPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [charge, setCharge] = useState(100);
  const [freeThreshold, setFreeThreshold] = useState<string>('');
  const [estimatedDays, setEstimatedDays] = useState('2-3 Business Days');
  const [isActive, setIsActive] = useState(true);

  const load = async () => {
    const [zRes, oRes] = await Promise.all([
      apiFetch<{ success: boolean; data: DeliveryZone[] }>('/admin/delivery-zones', { isAdmin: true }),
      apiFetch<{ success: boolean; data: OrderDetail[] }>('/admin/orders', { isAdmin: true }),
    ]);
    setZones(zRes.data);
    setOrders(oRes.data);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const openZoneModal = (z?: DeliveryZone) => {
    if (z) {
      setEditing(z);
      setName(z.name);
      setSlug(z.slug);
      setCharge(z.charge);
      setFreeThreshold(z.freeShippingThreshold ? String(z.freeShippingThreshold) : '');
      setEstimatedDays(z.estimatedDays);
      setIsActive(z.isActive);
    } else {
      setEditing(null);
      setName('');
      setSlug('');
      setCharge(120);
      setFreeThreshold('');
      setEstimatedDays('2-4 Business Days');
      setIsActive(true);
    }
    setModalOpen(true);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      slug: slug || slugify(name),
      charge: Number(charge),
      freeShippingThreshold: freeThreshold ? Number(freeThreshold) : null,
      estimatedDays,
      isActive,
    };
    if (editing) {
      await apiFetch(`/admin/delivery-zones/${editing.id}`, {
        method: 'PATCH',
        isAdmin: true,
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch('/admin/delivery-zones', {
        method: 'POST',
        isAdmin: true,
        body: JSON.stringify(payload),
      });
    }
    setModalOpen(false);
    await load();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6" /> Delivery Zones & Courier Dispatch
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure regional delivery rates, free-shipping thresholds, and monitor active shipments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openZoneModal()}
          className="px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded hover:bg-neutral-800 inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Delivery Zone
        </button>
      </div>

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {zones.map((z) => (
          <div key={z.id} className="bg-white border border-neutral-200 rounded-lg p-5 space-y-2">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-sm">{z.name}</h3>
              <button type="button" onClick={() => openZoneModal(z)} className="text-neutral-500 hover:text-neutral-900">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-2xl font-bold">{formatBDT(z.charge)}</p>
            <p className="text-xs text-neutral-600">ETA: {z.estimatedDays}</p>
            <p className="text-xs text-emerald-700">
              {z.freeShippingThreshold
                ? `Free shipping above ${formatBDT(z.freeShippingThreshold)}`
                : 'Flat shipping rate'}
            </p>
          </div>
        ))}
      </div>

      {/* Active Shipments Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
          <h2 className="text-sm font-semibold">Order Shipments & Courier Tracking</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-neutral-200 text-neutral-500">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Recipient & Address</th>
                <th className="px-4 py-3">Courier Partner</th>
                <th className="px-4 py-3">Tracking #</th>
                <th className="px-4 py-3">ETA</th>
                <th className="px-4 py-3">Delivery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-mono font-semibold">{o.orderNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{o.customerName} ({o.customerPhone})</p>
                    <p className="text-[11px] text-neutral-500">{o.deliveryAddress}, {o.area}, {o.city}</p>
                  </td>
                  <td className="px-4 py-3">{o.delivery?.courierPartner || 'QAYZ Express'}</td>
                  <td className="px-4 py-3 font-mono">{o.delivery?.trackingNumber || '—'}</td>
                  <td className="px-4 py-3">{o.delivery?.estimatedDeliveryDate || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-medium ${getStatusBadgeClass(o.deliveryStatus)}`}>
                      {o.deliveryStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-base">{editing ? 'Edit Delivery Zone' : 'New Delivery Zone'}</h2>
              <button type="button" onClick={() => setModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveZone} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Zone Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editing) setSlug(slugify(e.target.value));
                  }}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Slug *</label>
                <input
                  required
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full px-3 py-2 border rounded font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Charge (BDT) *</label>
                  <input required type="number" min={0} value={charge} onChange={(e) => setCharge(Number(e.target.value))} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Free Shipping Over (BDT)</label>
                  <input type="number" min={0} value={freeThreshold} onChange={(e) => setFreeThreshold(e.target.value)} placeholder="Optional" className="w-full px-3 py-2 border rounded" />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Estimated Delivery Time *</label>
                <input required value={estimatedDays} onChange={(e) => setEstimatedDays(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-neutral-900 text-white rounded font-medium">Save Zone</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
