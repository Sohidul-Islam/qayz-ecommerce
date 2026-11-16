'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, ArrowLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const DEMO_ROLES = [
  { label: 'Super Admin', email: 'admin@qayz.com' },
  { label: 'Admin', email: 'manager@qayz.com' },
  { label: 'Order Manager', email: 'orders@qayz.com' },
  { label: 'Inventory Manager', email: 'inventory@qayz.com' },
  { label: 'Content Manager', email: 'content@qayz.com' },
  { label: 'Analytics Viewer', email: 'analytics@qayz.com' },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@qayz.com');
  const [password, setPassword] = useState('Admin@12345!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{
        success: boolean;
        data: { token: string };
      }>('/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (typeof window !== 'undefined' && res.data?.token) {
        localStorage.setItem('qayz_admin_token', res.data.token);
      }
      router.push('/admin');
    } catch (err) {
      setError((err as Error).message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111113] text-[#F8F6F1] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#18181B] border border-neutral-800 p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <span className="font-serif text-xl tracking-[0.22em] uppercase">QAYZ Admin</span>
          </div>
          <Link href="/" className="text-xs text-neutral-400 hover:text-white inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Storefront
          </Link>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Secure Operations Sign In</h1>
          <p className="text-xs text-neutral-400">
            Protected by HTTP-only JWT cookies, RBAC permission guards, rate limiting, and audit logs.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
              Admin Email
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
              Password
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-xs text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#F8F6F1] text-[#111113] text-xs uppercase tracking-widest font-semibold hover:bg-neutral-200 inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-3.5 h-3.5" />
            {loading ? 'Verifying…' : 'Sign In to Admin Studio'}
          </button>
        </form>

        <div className="pt-4 border-t border-neutral-800 space-y-2.5">
          <p className="text-[11px] uppercase tracking-wider text-neutral-400">
            Quick-Fill RBAC Role Accounts (Pass: Admin@12345!)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ROLES.map((r) => (
              <button
                key={r.email}
                type="button"
                onClick={() => {
                  setEmail(r.email);
                  setPassword('Admin@12345!');
                }}
                className={`px-2.5 py-1.5 text-left text-[11px] border transition-colors ${
                  email === r.email
                    ? 'border-amber-400 bg-amber-400/10 text-amber-200'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-600'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
