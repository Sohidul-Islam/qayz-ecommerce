import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';
import type { Request } from 'express';
import { getClientIp } from '../middleware/security.js';

export interface RecordAuditParams {
  adminUserId?: number | null;
  adminEmail?: string;
  adminRole?: string;
  action: string;
  resource: string;
  resourceId?: string | number;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  req?: Request;
}

export async function recordAuditLog(params: RecordAuditParams): Promise<void> {
  const admin = params.req?.admin;
  await db.insert(auditLogs).values({
    adminUserId: params.adminUserId ?? admin?.id ?? null,
    adminEmail: params.adminEmail ?? admin?.email ?? 'system',
    adminRole: params.adminRole ?? admin?.roleSlug ?? 'system',
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId !== undefined ? String(params.resourceId) : '',
    previousValue: params.previousValue ?? null,
    newValue: params.newValue ?? null,
    ipAddress: params.req ? getClientIp(params.req) : '',
    userAgent: params.req ? String(params.req.headers['user-agent'] || '').slice(0, 300) : '',
  });
}
