'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Plus, X, Unlock } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';

interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  roleId: number;
  roleName: string;
  roleSlug: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
}

interface PermissionDef {
  id: number;
  code: string;
  name: string;
  module: string;
}

interface RoleWithPerms {
  id: number;
  name: string;
  slug: string;
  description: string;
  permissions: PermissionDef[];
}

export default function AdminUsersRolesPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [roles, setRoles] = useState<RoleWithPerms[]>([]);
  const [allPerms, setAllPerms] = useState<PermissionDef[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<number>(2);
  const [error, setError] = useState('');

  const load = async () => {
    const [uRes, rRes] = await Promise.all([
      apiFetch<{ success: boolean; data: AdminUserRow[] }>('/admin/users', { isAdmin: true }),
      apiFetch<{
        success: boolean;
        data: { roles: RoleWithPerms[]; allPermissions: PermissionDef[] };
      }>('/admin/roles', { isAdmin: true }),
    ]);
    setUsers(uRes.data);
    setRoles(rRes.data.roles);
    setAllPerms(rRes.data.allPermissions);
  };

  useEffect(() => {
    load().catch((err) => setError((err as Error).message));
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/admin/users', {
        method: 'POST',
        isAdmin: true,
        body: JSON.stringify({ name, email, password, roleId: Number(roleId) }),
      });
      setModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggleUserActive = async (u: AdminUserRow) => {
    await apiFetch(`/admin/users/${u.id}`, {
      method: 'PATCH',
      isAdmin: true,
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    await load();
  };

  const unlockUser = async (u: AdminUserRow) => {
    await apiFetch(`/admin/users/${u.id}`, {
      method: 'PATCH',
      isAdmin: true,
      body: JSON.stringify({ unlockAccount: true }),
    });
    await load();
  };

  const toggleRolePermission = async (role: RoleWithPerms, permId: number) => {
    if (role.slug === 'super_admin') return;
    const currentIds = role.permissions.map((p) => p.id);
    const nextIds = currentIds.includes(permId)
      ? currentIds.filter((id) => id !== permId)
      : [...currentIds, permId];
    await apiFetch(`/admin/roles/${role.id}/permissions`, {
      method: 'PATCH',
      isAdmin: true,
      body: JSON.stringify({ permissionIds: nextIds }),
    });
    await load();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6" /> Admin Users & RBAC Permissions
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Enforced server-side on every protected endpoint with password policy & lockout protection.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError('');
            setModalOpen(true);
          }}
          className="px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded hover:bg-neutral-800 inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Admin User
        </button>
      </div>

      {/* Admin Users Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 border-b text-neutral-500 uppercase">
              <tr>
                <th className="px-4 py-3">Name & Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map((u) => {
                const locked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{u.name}</p>
                      <p className="text-neutral-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-neutral-100 rounded font-medium">{u.roleName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          locked
                            ? 'bg-rose-50 text-rose-700'
                            : u.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        {locked ? 'Locked (Brute-force)' : u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {u.lastLoginAt ? formatDateShort(u.lastLoginAt) : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {locked && (
                        <button
                          type="button"
                          onClick={() => unlockUser(u)}
                          className="px-2.5 py-1 border border-amber-300 text-amber-800 rounded inline-flex items-center gap-1"
                        >
                          <Unlock className="w-3 h-3" /> Unlock
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleUserActive(u)}
                        className="px-2.5 py-1 border border-neutral-300 rounded hover:bg-neutral-100"
                      >
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permission Matrix */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
          <h2 className="text-sm font-semibold">Extensible Role Permissions Matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b text-neutral-500">
              <tr>
                <th className="px-4 py-3">Permission</th>
                {roles.map((r) => (
                  <th key={r.id} className="px-3 py-3 text-center">
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {allPerms.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-[10px] font-mono text-neutral-400">{p.code}</p>
                  </td>
                  {roles.map((r) => {
                    const checked =
                      r.slug === 'super_admin' || r.permissions.some((rp) => rp.id === p.id);
                    return (
                      <td key={r.id} className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={r.slug === 'super_admin'}
                          onChange={() => toggleRolePermission(r, p.id)}
                          className="accent-neutral-900 w-4 h-4 cursor-pointer"
                        />
                      </td>
                    );
                  })}
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
              <h2 className="font-bold text-base">Create Admin Account</h2>
              <button type="button" onClick={() => setModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            {error && <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded">{error}</p>}
            <form onSubmit={handleCreateAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Full Name *</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">Email *</label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">
                  Strong Password * (min 8 chars, upper, lower, number, symbol)
                </label>
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">Role *</label>
                <select value={roleId} onChange={(e) => setRoleId(Number(e.target.value))} className="w-full px-3 py-2 border rounded">
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-neutral-900 text-white rounded font-medium">Create Admin</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
