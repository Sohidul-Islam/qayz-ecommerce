import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { adminUsers, roles, rolePermissions, permissions } from '../db/schema.js';
import { env } from '../config/env.js';
import { AppError } from './error.js';

export interface AuthenticatedAdmin {
  id: number;
  name: string;
  email: string;
  roleId: number;
  roleSlug: string;
  roleName: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
    }
  }
}

export const ADMIN_COOKIE_NAME = 'qayz_admin_token';

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character';
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAdminToken(payload: { adminId: number; email: string; roleSlug: string }): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export async function loadAdminWithPermissions(adminId: number): Promise<AuthenticatedAdmin | null> {
  const rows = await db
    .select({
      id: adminUsers.id,
      name: adminUsers.name,
      email: adminUsers.email,
      roleId: adminUsers.roleId,
      isActive: adminUsers.isActive,
      roleSlug: roles.slug,
      roleName: roles.name,
    })
    .from(adminUsers)
    .innerJoin(roles, eq(adminUsers.roleId, roles.id))
    .where(eq(adminUsers.id, adminId))
    .limit(1);

  const admin = rows[0];
  if (!admin || !admin.isActive) return null;

  const permRows = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, admin.roleId));

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    roleId: admin.roleId,
    roleSlug: admin.roleSlug,
    roleName: admin.roleName,
    permissions: permRows.map((p) => p.code),
  };
}

export async function requireAdminAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined = req.cookies?.[ADMIN_COOKIE_NAME];
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }

    let decoded: { adminId: number };
    try {
      decoded = jwt.verify(token, env.jwtSecret) as { adminId: number };
    } catch {
      throw new AppError(401, 'Invalid or expired authentication token', 'INVALID_TOKEN');
    }

    const admin = await loadAdminWithPermissions(decoded.adminId);
    if (!admin) {
      throw new AppError(401, 'Admin account inactive or not found', 'ACCOUNT_INACTIVE');
    }

    req.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePermission(permissionCode: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.admin) {
      next(new AppError(401, 'Authentication required', 'UNAUTHORIZED'));
      return;
    }

    if (
      req.admin.roleSlug === 'super_admin' ||
      req.admin.permissions.includes(permissionCode)
    ) {
      next();
      return;
    }

    next(
      new AppError(
        403,
        `Forbidden: requires '${permissionCode}' permission`,
        'FORBIDDEN'
      )
    );
  };
}

