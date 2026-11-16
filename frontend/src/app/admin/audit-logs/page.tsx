'use client';

import React, { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

interface AuditRow {
  id: number;
  adminEmail: string;
  adminRole: string;
  action: string;
  resource: string;
  resourceId: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [resource, setResource] = useState('all');

  useEffect(() => {
    apiFetch<{ success: boolean; data: AuditRow[] }>(
      `/admin/audit-logs?resource=${resource}`,
      { isAdmin: true }
    )
      .then((res) => setLogs(res.data))
      .catch(() => undefined);
  }, [resource]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="w-6 h-6" /> Security & Operations Audit Trail
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Immutable chronological log of administrative mutations, security events, and value diffs.
          </p>
        </div>

        <select
          value={resource}
          onChange={(e) => setResource(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-neutral-300 rounded"
        >
          <option value="all">All Resources</option>
          <option value="product">Products</option>
          <option value="order">Orders</option>
          <option value="delivery">Deliveries</option>
          <option value="inventory">Inventory</option>
          <option value="admin_user">Admin Users</option>
          <option value="role">Roles & Permissions</option>
          <option value="auth">Authentication</option>
          <option value="settings">Settings</option>
        </select>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 border-b text-neutral-500 uppercase">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Changes (Prev → New)</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                    {formatDateTime(l.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{l.adminEmail}</p>
                    <p className="text-[10px] text-neutral-400 uppercase">{l.adminRole}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold">{l.action}</td>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    {l.resource} #{l.resourceId}
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    {l.previousValue && (
                      <p className="text-[11px] text-rose-700 font-mono truncate">
                        - {JSON.stringify(l.previousValue)}
                      </p>
                    )}
                    {l.newValue && (
                      <p className="text-[11px] text-emerald-700 font-mono truncate">
                        + {JSON.stringify(l.newValue)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-neutral-500">{l.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

