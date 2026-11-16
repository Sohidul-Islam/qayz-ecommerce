'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Tag, Bell, Save } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatBDT } from '@/lib/utils';

interface CouponRow {
  id: number;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  usedCount: number;
  isActive: boolean;
}

interface NotificationRow {
  id: number;
  channel: string;
  event: string;
  recipient: string;
  subject: string;
  status: string;
  createdAt: string;
}

export default function AdminSettingsPage() {
  const [brandName, setBrandName] = useState('QAYZ');
  const [supportEmail, setSupportEmail] = useState('concierge@qayz.com');
  const [supportPhone, setSupportPhone] = useState('+880 1700-004500');
  const [address, setAddress] = useState('Road 11, Banani, Dhaka 1213, Bangladesh');
  const [enableEmail, setEnableEmail] = useState(true);
  const [enableSms, setEnableSms] = useState(true);
  const [enableWhatsapp, setEnableWhatsapp] = useState(false);

  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'percentage' | 'fixed'>('percentage');
  const [newVal, setNewVal] = useState(10);
  const [newMin, setNewMin] = useState(3000);
  const [savedMsg, setSavedMsg] = useState('');

  const loadAll = async () => {
    const [sRes, cRes, nRes] = await Promise.all([
      apiFetch<{ success: boolean; data: Record<string, Record<string, unknown>> }>('/admin/settings', { isAdmin: true }),
      apiFetch<{ success: boolean; data: CouponRow[] }>('/admin/coupons', { isAdmin: true }),
      apiFetch<{ success: boolean; data: NotificationRow[] }>('/admin/notifications', { isAdmin: true }),
    ]);

    const brand = sRes.data.brand;
    if (brand) {
      if (typeof brand.name === 'string') setBrandName(brand.name);
      if (typeof brand.supportEmail === 'string') setSupportEmail(brand.supportEmail);
      if (typeof brand.supportPhone === 'string') setSupportPhone(brand.supportPhone);
      if (typeof brand.address === 'string') setAddress(brand.address);
    }
    const notif = sRes.data.notifications;
    if (notif) {
      setEnableEmail(Boolean(notif.enableEmail));
      setEnableSms(Boolean(notif.enableSms));
      setEnableWhatsapp(Boolean(notif.enableWhatsapp));
    }

    setCoupons(cRes.data);
    setNotifications(nRes.data);
  };

  useEffect(() => {
    loadAll().catch(() => undefined);
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg('');
    await apiFetch('/admin/settings', {
      method: 'PUT',
      isAdmin: true,
      body: JSON.stringify({
        brand: { name: brandName, supportEmail, supportPhone, address, currency: 'BDT' },
        notifications: { enableEmail, enableSms, enableWhatsapp },
      }),
    });
    setSavedMsg('Store settings saved & logged in audit trail.');
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    await apiFetch('/admin/coupons', {
      method: 'POST',
      isAdmin: true,
      body: JSON.stringify({
        code: newCode.trim().toUpperCase(),
        discountType: newType,
        discountValue: Number(newVal),
        minOrderAmount: Number(newMin),
        description: `${newVal}${newType === 'percentage' ? '%' : ' BDT'} off`,
      }),
    });
    setNewCode('');
    await loadAll();
  };

  const toggleCoupon = async (c: CouponRow) => {
    await apiFetch(`/admin/coupons/${c.id}`, {
      method: 'PATCH',
      isAdmin: true,
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    await loadAll();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6" /> Store Settings, Coupons & Notifications
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure atelier details, discount codes, and pluggable Email/SMS/WhatsApp notification channels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store & Notification Settings */}
        <form onSubmit={handleSaveSettings} className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4 text-xs">
          <h2 className="text-sm font-bold border-b pb-2">Brand & Notification Channels</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1">Brand Name</label>
              <input value={brandName} onChange={(e) => setBrandName(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block font-medium mb-1">Concierge Phone</label>
              <input value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
          </div>
          <div>
            <label className="block font-medium mb-1">Support Email</label>
            <input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block font-medium mb-1">Atelier Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>

          <div className="pt-2 space-y-2">
            <p className="font-semibold">Automated Notification Channels</p>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={enableEmail} onChange={(e) => setEnableEmail(e.target.checked)} />
              Email Receipts & Order Updates
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={enableSms} onChange={(e) => setEnableSms(e.target.checked)} />
              SMS Order & Delivery Alerts
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={enableWhatsapp} onChange={(e) => setEnableWhatsapp(e.target.checked)} />
              WhatsApp Business Notifications (Future Provider Ready)
            </label>
          </div>

          {savedMsg && <p className="text-emerald-700 font-medium">{savedMsg}</p>}
          <button type="submit" className="px-5 py-2.5 bg-neutral-900 text-white rounded font-medium inline-flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> Save Settings
          </button>
        </form>

        {/* Coupons Manager */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4 text-xs">
          <h2 className="text-sm font-bold border-b pb-2 flex items-center gap-1.5">
            <Tag className="w-4 h-4" /> Server-Validated Coupons
          </h2>
          <form onSubmit={handleCreateCoupon} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input
              required
              placeholder="Code (EID20)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="px-2.5 py-2 border rounded font-mono uppercase"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as 'percentage' | 'fixed')}
              className="px-2.5 py-2 border rounded"
            >
              <option value="percentage">%</option>
              <option value="fixed">BDT</option>
            </select>
            <input
              type="number"
              min={1}
              value={newVal}
              onChange={(e) => setNewVal(Number(e.target.value))}
              placeholder="Value"
              className="px-2.5 py-2 border rounded"
            />
            <button type="submit" className="px-3 py-2 bg-neutral-900 text-white rounded font-medium">
              Add Code
            </button>
          </form>

          <div className="divide-y divide-neutral-100">
            {coupons.map((c) => (
              <div key={c.id} className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-mono font-bold text-sm">{c.code}</span>
                  <span className="ml-2 text-neutral-600">
                    {c.discountType === 'percentage' ? `${c.discountValue}% off` : `${formatBDT(c.discountValue)} off`}
                    {' · Min '}
                    {formatBDT(c.minOrderAmount)}
                  </span>
                  <p className="text-[11px] text-neutral-400">Used {c.usedCount} times</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleCoupon(c)}
                  className={`px-2.5 py-1 rounded border text-[11px] font-medium ${
                    c.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {c.isActive ? 'Active' : 'Paused'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Notification Outbox */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3 text-xs">
        <h2 className="text-sm font-bold flex items-center gap-1.5">
          <Bell className="w-4 h-4" /> Notification Dispatch Queue (Email / SMS / Internal Alerts)
        </h2>
        <div className="divide-y divide-neutral-100">
          {notifications.slice(0, 8).map((n) => (
            <div key={n.id} className="py-2 flex justify-between items-center gap-4">
              <div>
                <span className="uppercase font-bold text-[10px] px-1.5 py-0.5 bg-neutral-100 rounded mr-2">
                  {n.channel}
                </span>
                <span className="font-medium">{n.subject}</span>
                <span className="text-neutral-500 ml-2">→ {n.recipient}</span>
              </div>
              <span className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded text-[10px] uppercase">
                {n.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
