import { Router, Request, Response, NextFunction } from 'express';
import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import fs from 'fs';
import { db } from '../db/index.js';
import {
  adminUsers,
  auditLogs,
  coupons,
  customers,
  deliveries,
  deliveryZones,
  inventory,
  notificationLogs,
  orderStatusHistory,
  orders,
  permissions,
  products,
  productVariants,
  rolePermissions,
  roles,
  storeSettings,
} from '../db/schema.js';
import {
  ADMIN_COOKIE_NAME,
  hashPassword,
  loadAdminWithPermissions,
  requireAdminAuth,
  requirePermission,
  signAdminToken,
  validatePasswordPolicy,
  verifyPassword,
} from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { authLoginLimiter, sanitizeText } from '../middleware/security.js';
import { uploadImageMiddleware, verifyImageMagicBytes } from '../middleware/upload.js';
import { env } from '../config/env.js';
import { recordAuditLog } from '../services/audit.service.js';
import {
  adjustInventoryByAdmin,
  getVariantTransactions,
} from '../services/inventory.service.js';
import {
  getOrderDetailsByNumber,
  updateOrderStatusByAdmin,
  VALID_DELIVERY_STATUSES,
  VALID_ORDER_STATUSES,
} from '../services/order.service.js';
import {
  getAdminDashboardMetrics,
  getFullAnalyticsReport,
} from '../services/analytics.service.js';

const router = Router();

// ==================== AUTH ====================

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/auth/login',
  authLoginLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const cleanEmail = email.trim().toLowerCase();

      const rows = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.email, cleanEmail))
        .limit(1);

      const user = rows[0];
      if (!user) {
        throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
      }

      if (!user.isActive) {
        throw new AppError(403, 'This admin account is deactivated', 'ACCOUNT_DISABLED');
      }

      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        throw new AppError(
          423,
          'Account temporarily locked due to multiple failed login attempts. Try again later.',
          'ACCOUNT_LOCKED'
        );
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        const nextAttempts = user.failedLoginAttempts + 1;
        const lockUntil =
          nextAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

        await db
          .update(adminUsers)
          .set({
            failedLoginAttempts: nextAttempts,
            lockedUntil: lockUntil,
            updatedAt: new Date(),
          })
          .where(eq(adminUsers.id, user.id));

        await recordAuditLog({
          req,
          adminUserId: user.id,
          adminEmail: user.email,
          action: 'Admin Login Failed',
          resource: 'auth',
          resourceId: user.id,
          newValue: { failedAttempts: nextAttempts, locked: Boolean(lockUntil) },
        });

        throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
      }

      await db
        .update(adminUsers)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(adminUsers.id, user.id));

      const hydratedAdmin = await loadAdminWithPermissions(user.id);
      if (!hydratedAdmin) {
        throw new AppError(401, 'Unable to load admin profile', 'ACCOUNT_INACTIVE');
      }

      const token = signAdminToken({
        adminId: hydratedAdmin.id,
        email: hydratedAdmin.email,
        roleSlug: hydratedAdmin.roleSlug,
      });

      res.cookie(ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      await recordAuditLog({
        req,
        adminUserId: hydratedAdmin.id,
        adminEmail: hydratedAdmin.email,
        adminRole: hydratedAdmin.roleSlug,
        action: 'Admin Login Success',
        resource: 'auth',
        resourceId: hydratedAdmin.id,
      });

      res.json({
        success: true,
        data: {
          admin: hydratedAdmin,
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/auth/logout', async (req: Request, res: Response) => {
  res.clearCookie(ADMIN_COOKIE_NAME);
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/auth/me', requireAdminAuth, async (req: Request, res: Response) => {
  res.json({ success: true, data: { admin: req.admin } });
});

// ==================== DASHBOARD ====================

router.get(
  '/dashboard',
  requireAdminAuth,
  requirePermission('dashboard.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getAdminDashboardMetrics();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// ==================== ORDERS & DELIVERY ====================

router.get(
  '/orders',
  requireAdminAuth,
  requirePermission('orders.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        search,
        status,
        paymentStatus,
        deliveryStatus,
        dateFrom,
        dateTo,
      } = req.query as Record<string, string | undefined>;

      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
      const allDeliveries = await db.select().from(deliveries);
      const delMap = new Map(allDeliveries.map((d) => [d.orderId, d]));

      const filtered = allOrders.filter((o) => {
        if (status && status !== 'all' && o.orderStatus !== status) return false;
        if (paymentStatus && paymentStatus !== 'all' && o.paymentStatus !== paymentStatus)
          return false;
        if (deliveryStatus && deliveryStatus !== 'all' && o.deliveryStatus !== deliveryStatus)
          return false;
        if (dateFrom && new Date(o.createdAt) < new Date(dateFrom)) return false;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          if (new Date(o.createdAt) > end) return false;
        }
        if (search && search.trim()) {
          const q = search.trim().toLowerCase();
          const hay = `${o.orderNumber} ${o.customerName} ${o.customerPhone} ${o.city} ${o.area}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      res.json({
        success: true,
        data: filtered.map((o) => ({
          ...o,
          delivery: delMap.get(o.id) || null,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/orders/:id',
  requireAdminAuth,
  requirePermission('orders.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const param = String(req.params.id);
      const isNum = /^\d+$/.test(param);
      let orderNumber = param;
      if (isNum) {
        const rows = await db
          .select({ orderNumber: orders.orderNumber })
          .from(orders)
          .where(eq(orders.id, Number(param)))
          .limit(1);
        if (!rows[0]) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
        orderNumber = rows[0].orderNumber;
      }
      const data = await getOrderDetailsByNumber(orderNumber);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(VALID_ORDER_STATUSES),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  note: z.string().max(500).optional(),
});

router.patch(
  '/orders/:id/status',
  requireAdminAuth,
  requirePermission('orders.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = Number(req.params.id);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        throw new AppError(400, 'Invalid order ID', 'INVALID_ID');
      }

      const body = updateOrderStatusSchema.parse(req.body);
      const result = await updateOrderStatusByAdmin({
        orderId,
        newStatus: body.orderStatus,
        paymentStatus: body.paymentStatus,
        note: body.note ? sanitizeText(body.note) : undefined,
        adminId: req.admin!.id,
        adminName: req.admin!.name,
      });

      await recordAuditLog({
        req,
        action: 'Order Status Changed',
        resource: 'order',
        resourceId: result.updated.orderNumber,
        previousValue: {
          orderStatus: result.previous.orderStatus,
          paymentStatus: result.previous.paymentStatus,
        },
        newValue: {
          orderStatus: result.updated.orderStatus,
          paymentStatus: result.updated.paymentStatus,
          stockRestored: result.stockRestored,
        },
      });

      const full = await getOrderDetailsByNumber(result.updated.orderNumber);
      res.json({ success: true, data: full });
    } catch (err) {
      next(err);
    }
  }
);

const updateDeliverySchema = z.object({
  deliveryStatus: z.enum(VALID_DELIVERY_STATUSES),
  courierPartner: z.string().min(2).max(120).optional(),
  trackingNumber: z.string().max(120).optional(),
  estimatedDeliveryDate: z.string().max(100).optional(),
  deliveryNotes: z.string().max(500).optional(),
});

router.patch(
  '/orders/:id/delivery',
  requireAdminAuth,
  requirePermission('orders.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = Number(req.params.id);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        throw new AppError(400, 'Invalid order ID', 'INVALID_ID');
      }
      const body = updateDeliverySchema.parse(req.body);

      const orderRows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      const order = orderRows[0];
      if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');

      const existingDel = await db
        .select()
        .from(deliveries)
        .where(eq(deliveries.orderId, orderId))
        .limit(1);

      const prevStatus = existingDel[0]?.deliveryStatus || order.deliveryStatus;

      await db.transaction(async (tx) => {
        await tx
          .update(orders)
          .set({
            deliveryStatus: body.deliveryStatus,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));

        if (existingDel[0]) {
          await tx
            .update(deliveries)
            .set({
              deliveryStatus: body.deliveryStatus,
              ...(body.courierPartner !== undefined
                ? { courierPartner: sanitizeText(body.courierPartner) }
                : {}),
              ...(body.trackingNumber !== undefined
                ? { trackingNumber: sanitizeText(body.trackingNumber) }
                : {}),
              ...(body.estimatedDeliveryDate !== undefined
                ? { estimatedDeliveryDate: sanitizeText(body.estimatedDeliveryDate) }
                : {}),
              ...(body.deliveryNotes !== undefined
                ? { deliveryNotes: sanitizeText(body.deliveryNotes) }
                : {}),
              actualDeliveryDate:
                body.deliveryStatus === 'Delivered'
                  ? new Date().toISOString().slice(0, 10)
                  : existingDel[0].actualDeliveryDate,
              updatedAt: new Date(),
            })
            .where(eq(deliveries.orderId, orderId));
        }

        if (prevStatus !== body.deliveryStatus) {
          await tx.insert(orderStatusHistory).values({
            orderId,
            previousStatus: prevStatus,
            newStatus: body.deliveryStatus,
            statusType: 'delivery',
            note: body.deliveryNotes
              ? sanitizeText(body.deliveryNotes)
              : `Delivery updated to ${body.deliveryStatus}`,
            changedByAdminId: req.admin!.id,
            changedByName: req.admin!.name,
          });
        }
      });

      await recordAuditLog({
        req,
        action: 'Delivery Status Changed',
        resource: 'delivery',
        resourceId: order.orderNumber,
        previousValue: { deliveryStatus: prevStatus },
        newValue: body as unknown as Record<string, unknown>,
      });

      const full = await getOrderDetailsByNumber(order.orderNumber);
      res.json({ success: true, data: full });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/orders/:id/notes',
  requireAdminAuth,
  requirePermission('orders.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = Number(req.params.id);
      const { internalNotes } = z.object({ internalNotes: z.string().max(2000) }).parse(req.body);

      const [updated] = await db
        .update(orders)
        .set({ internalNotes: sanitizeText(internalNotes), updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();

      if (!updated) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');

      await recordAuditLog({
        req,
        action: 'Order Internal Note Updated',
        resource: 'order',
        resourceId: updated.orderNumber,
        newValue: { internalNotes: updated.internalNotes },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// Delivery Zones Management
router.get(
  '/delivery-zones',
  requireAdminAuth,
  requirePermission('orders.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const zones = await db.select().from(deliveryZones).orderBy(asc(deliveryZones.id));
      res.json({ success: true, data: zones });
    } catch (err) {
      next(err);
    }
  }
);

const deliveryZoneSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  charge: z.number().int().min(0),
  freeShippingThreshold: z.number().int().positive().nullable().optional(),
  estimatedDays: z.string().min(2).max(100),
  isActive: z.boolean().optional().default(true),
});

router.post(
  '/delivery-zones',
  requireAdminAuth,
  requirePermission('settings.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = deliveryZoneSchema.parse(req.body);
      const [created] = await db.insert(deliveryZones).values(body).returning();
      await recordAuditLog({
        req,
        action: 'Delivery Zone Created',
        resource: 'delivery_zone',
        resourceId: created.id,
        newValue: created as unknown as Record<string, unknown>,
      });
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/delivery-zones/:id',
  requireAdminAuth,
  requirePermission('settings.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const body = deliveryZoneSchema.partial().parse(req.body);
      const [updated] = await db
        .update(deliveryZones)
        .set(body)
        .where(eq(deliveryZones.id, id))
        .returning();
      if (!updated) throw new AppError(404, 'Delivery zone not found', 'NOT_FOUND');
      await recordAuditLog({
        req,
        action: 'Delivery Zone Updated',
        resource: 'delivery_zone',
        resourceId: id,
        newValue: updated as unknown as Record<string, unknown>,
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ==================== INVENTORY ====================

router.get(
  '/inventory',
  requireAdminAuth,
  requirePermission('inventory.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filter, search } = req.query as Record<string, string | undefined>;
      const rows = await db
        .select({
          inventoryId: inventory.id,
          variantId: productVariants.id,
          productId: products.id,
          productName: products.name,
          productSlug: products.slug,
          sku: productVariants.sku,
          color: productVariants.color,
          colorHex: productVariants.colorHex,
          size: productVariants.size,
          currentStock: inventory.currentStock,
          reservedStock: inventory.reservedStock,
          availableStock: inventory.availableStock,
          soldQuantity: inventory.soldQuantity,
          lowStockThreshold: inventory.lowStockThreshold,
          updatedAt: inventory.updatedAt,
          isArchived: products.isArchived,
        })
        .from(inventory)
        .innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(eq(products.isArchived, false))
        .orderBy(asc(inventory.availableStock), asc(products.name));

      const filtered = rows.filter((r) => {
        if (filter === 'low_stock' && !(r.availableStock > 0 && r.availableStock <= r.lowStockThreshold)) {
          return false;
        }
        if (filter === 'out_of_stock' && r.availableStock > 0) {
          return false;
        }
        if (search && search.trim()) {
          const q = search.trim().toLowerCase();
          const hay = `${r.productName} ${r.sku} ${r.color} ${r.size}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      res.json({ success: true, data: filtered });
    } catch (err) {
      next(err);
    }
  }
);

const adjustInventorySchema = z.object({
  changeAmount: z.number().int().optional(),
  setStock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  reason: z.enum([
    'Initial Stock',
    'Purchase/Restock',
    'Order',
    'Order Cancellation',
    'Return',
    'Manual Adjustment',
    'Damaged',
  ]),
  note: z.string().max(400).optional(),
});

router.patch(
  '/inventory/:variantId',
  requireAdminAuth,
  requirePermission('inventory.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const variantId = Number(req.params.variantId);
      if (!Number.isInteger(variantId) || variantId <= 0) {
        throw new AppError(400, 'Invalid variant ID', 'INVALID_ID');
      }

      const body = adjustInventorySchema.parse(req.body);
      const result = await adjustInventoryByAdmin({
        variantId,
        changeAmount: body.changeAmount,
        setStock: body.setStock,
        lowStockThreshold: body.lowStockThreshold,
        reason: body.reason,
        note: body.note ? sanitizeText(body.note) : undefined,
        adminId: req.admin!.id,
      });

      await recordAuditLog({
        req,
        action: 'Stock Updated',
        resource: 'inventory',
        resourceId: variantId,
        previousValue: {
          currentStock: result.previous.currentStock,
          availableStock: result.previous.availableStock,
          lowStockThreshold: result.previous.lowStockThreshold,
        },
        newValue: {
          currentStock: result.updated.currentStock,
          availableStock: result.updated.availableStock,
          lowStockThreshold: result.updated.lowStockThreshold,
          reason: body.reason,
        },
      });

      res.json({ success: true, data: result.updated });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/inventory/:variantId/transactions',
  requireAdminAuth,
  requirePermission('inventory.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const variantId = Number(req.params.variantId);
      const txs = await getVariantTransactions(variantId);
      res.json({ success: true, data: txs });
    } catch (err) {
      next(err);
    }
  }
);

// ==================== ANALYTICS & CUSTOMERS ====================

router.get(
  '/analytics',
  requireAdminAuth,
  requirePermission('analytics.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
      const report = await getFullAnalyticsReport(days);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/customers',
  requireAdminAuth,
  requirePermission('orders.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await db.select().from(customers).orderBy(desc(customers.totalSpent));
      res.json({ success: true, data: list });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/abandoned-carts',
  requireAdminAuth,
  requirePermission('analytics.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await getFullAnalyticsReport(30);
      res.json({ success: true, data: report.abandonedCarts });
    } catch (err) {
      next(err);
    }
  }
);

// ==================== ADMIN USERS & ROLES ====================

router.get(
  '/users',
  requireAdminAuth,
  requirePermission('users.manage'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await db
        .select({
          id: adminUsers.id,
          name: adminUsers.name,
          email: adminUsers.email,
          roleId: adminUsers.roleId,
          roleName: roles.name,
          roleSlug: roles.slug,
          isActive: adminUsers.isActive,
          failedLoginAttempts: adminUsers.failedLoginAttempts,
          lockedUntil: adminUsers.lockedUntil,
          lastLoginAt: adminUsers.lastLoginAt,
          createdAt: adminUsers.createdAt,
        })
        .from(adminUsers)
        .innerJoin(roles, eq(adminUsers.roleId, roles.id))
        .orderBy(asc(adminUsers.id));

      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }
);

const createAdminUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.number().int().positive(),
  isActive: z.boolean().optional().default(true),
});

router.post(
  '/users',
  requireAdminAuth,
  requirePermission('users.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createAdminUserSchema.parse(req.body);
      const policyErr = validatePasswordPolicy(body.password);
      if (policyErr) {
        throw new AppError(400, policyErr, 'WEAK_PASSWORD');
      }

      const cleanEmail = body.email.trim().toLowerCase();
      const existing = await db
        .select({ id: adminUsers.id })
        .from(adminUsers)
        .where(eq(adminUsers.email, cleanEmail))
        .limit(1);
      if (existing[0]) {
        throw new AppError(409, 'Admin user with this email already exists', 'EMAIL_CONFLICT');
      }

      const passwordHash = await hashPassword(body.password);
      const [created] = await db
        .insert(adminUsers)
        .values({
          name: sanitizeText(body.name),
          email: cleanEmail,
          passwordHash,
          roleId: body.roleId,
          isActive: body.isActive,
        })
        .returning({
          id: adminUsers.id,
          name: adminUsers.name,
          email: adminUsers.email,
          roleId: adminUsers.roleId,
          isActive: adminUsers.isActive,
          createdAt: adminUsers.createdAt,
        });

      await recordAuditLog({
        req,
        action: 'Admin Created',
        resource: 'admin_user',
        resourceId: created.id,
        newValue: { email: created.email, roleId: created.roleId, isActive: created.isActive },
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/users/:id',
  requireAdminAuth,
  requirePermission('users.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const body = z
        .object({
          name: z.string().min(2).max(120).optional(),
          roleId: z.number().int().positive().optional(),
          isActive: z.boolean().optional(),
          unlockAccount: z.boolean().optional(),
        })
        .parse(req.body);

      const existingRows = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
      const existing = existingRows[0];
      if (!existing) throw new AppError(404, 'Admin user not found', 'NOT_FOUND');

      const [updated] = await db
        .update(adminUsers)
        .set({
          ...(body.name !== undefined ? { name: sanitizeText(body.name) } : {}),
          ...(body.roleId !== undefined ? { roleId: body.roleId } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.unlockAccount ? { failedLoginAttempts: 0, lockedUntil: null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(adminUsers.id, id))
        .returning({
          id: adminUsers.id,
          name: adminUsers.name,
          email: adminUsers.email,
          roleId: adminUsers.roleId,
          isActive: adminUsers.isActive,
        });

      await recordAuditLog({
        req,
        action: 'Admin Permission Changed',
        resource: 'admin_user',
        resourceId: id,
        previousValue: { roleId: existing.roleId, isActive: existing.isActive },
        newValue: { roleId: updated.roleId, isActive: updated.isActive },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/roles',
  requireAdminAuth,
  requirePermission('users.manage'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [allRoles, allPerms, mappings] = await Promise.all([
        db.select().from(roles).orderBy(asc(roles.id)),
        db.select().from(permissions).orderBy(asc(permissions.module), asc(permissions.id)),
        db.select().from(rolePermissions),
      ]);

      const permById = new Map(allPerms.map((p) => [p.id, p]));
      const rolesWithPerms = allRoles.map((r) => {
        const permIds = mappings.filter((m) => m.roleId === r.id).map((m) => m.permissionId);
        return {
          ...r,
          permissions: permIds.map((pid) => permById.get(pid)).filter(Boolean),
        };
      });

      res.json({
        success: true,
        data: {
          roles: rolesWithPerms,
          allPermissions: allPerms,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/roles/:id/permissions',
  requireAdminAuth,
  requirePermission('users.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roleId = Number(req.params.id);
      const { permissionIds } = z
        .object({ permissionIds: z.array(z.number().int().positive()) })
        .parse(req.body);

      const roleRows = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
      if (!roleRows[0]) throw new AppError(404, 'Role not found', 'NOT_FOUND');

      const prevMappings = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      await db.transaction(async (tx) => {
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
        if (permissionIds.length > 0) {
          const validPerms = await tx
            .select({ id: permissions.id })
            .from(permissions)
            .where(inArray(permissions.id, permissionIds));
          for (const p of validPerms) {
            await tx.insert(rolePermissions).values({ roleId, permissionId: p.id });
          }
        }
      });

      await recordAuditLog({
        req,
        action: 'Admin Permission Changed',
        resource: 'role',
        resourceId: roleId,
        previousValue: { permissionIds: prevMappings.map((m) => m.permissionId) },
        newValue: { permissionIds },
      });

      res.json({ success: true, message: 'Role permissions updated' });
    } catch (err) {
      next(err);
    }
  }
);

// ==================== AUDIT LOGS ====================

router.get(
  '/audit-logs',
  requireAdminAuth,
  requirePermission('audit.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { resource, limit = '100' } = req.query as Record<string, string | undefined>;
      const rows = await db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(Math.min(250, Number(limit) || 100));

      const filtered =
        resource && resource !== 'all' ? rows.filter((r) => r.resource === resource) : rows;
      res.json({ success: true, data: filtered });
    } catch (err) {
      next(err);
    }
  }
);

// ==================== SETTINGS, COUPONS & NOTIFICATIONS ====================

router.get(
  '/settings',
  requireAdminAuth,
  requirePermission('settings.manage'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await db.select().from(storeSettings);
      const settingsObj: Record<string, unknown> = {};
      for (const r of rows) settingsObj[r.key] = r.value;
      res.json({ success: true, data: settingsObj });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/settings',
  requireAdminAuth,
  requirePermission('settings.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = z.record(z.unknown()).parse(req.body);
      for (const [key, value] of Object.entries(body)) {
        const existing = await db
          .select()
          .from(storeSettings)
          .where(eq(storeSettings.key, key))
          .limit(1);
        if (existing[0]) {
          await db
            .update(storeSettings)
            .set({ value, updatedByAdminId: req.admin!.id, updatedAt: new Date() })
            .where(eq(storeSettings.id, existing[0].id));
        } else {
          await db.insert(storeSettings).values({
            key,
            value,
            updatedByAdminId: req.admin!.id,
          });
        }
      }

      await recordAuditLog({
        req,
        action: 'Settings Updated',
        resource: 'settings',
        resourceId: 'store',
        newValue: body,
      });

      res.json({ success: true, message: 'Settings updated' });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/coupons',
  requireAdminAuth,
  requirePermission('settings.manage'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/coupons',
  requireAdminAuth,
  requirePermission('settings.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = z
        .object({
          code: z.string().min(2).max(40),
          description: z.string().max(250).optional().default(''),
          discountType: z.enum(['percentage', 'fixed']),
          discountValue: z.number().int().positive(),
          minOrderAmount: z.number().int().min(0).optional().default(0),
          maxDiscountAmount: z.number().int().positive().nullable().optional(),
          isActive: z.boolean().optional().default(true),
        })
        .parse(req.body);

      const [created] = await db
        .insert(coupons)
        .values({
          ...body,
          code: body.code.trim().toUpperCase(),
        })
        .returning();

      await recordAuditLog({
        req,
        action: 'Coupon Created',
        resource: 'coupon',
        resourceId: created.code,
        newValue: created as unknown as Record<string, unknown>,
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/coupons/:id',
  requireAdminAuth,
  requirePermission('settings.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
      const [updated] = await db
        .update(coupons)
        .set({ isActive })
        .where(eq(coupons.id, id))
        .returning();
      if (!updated) throw new AppError(404, 'Coupon not found', 'NOT_FOUND');
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/notifications',
  requireAdminAuth,
  requirePermission('dashboard.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await db
        .select()
        .from(notificationLogs)
        .orderBy(desc(notificationLogs.createdAt))
        .limit(50);
      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  }
);

// ==================== SECURE IMAGE UPLOAD ====================

router.post(
  '/upload',
  requireAdminAuth,
  requirePermission('products.manage'),
  uploadImageMiddleware.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError(400, 'No image file provided', 'NO_FILE');
      }

      const validMagic = verifyImageMagicBytes(req.file.path);
      if (!validMagic) {
        fs.unlinkSync(req.file.path);
        throw new AppError(
          400,
          'Uploaded file failed binary image signature validation',
          'MALICIOUS_FILE_REJECTED'
        );
      }

      const publicUrl = `/uploads/${req.file.filename}`;
      await recordAuditLog({
        req,
        action: 'Image Uploaded',
        resource: 'media',
        resourceId: req.file.filename,
        newValue: { url: publicUrl, size: req.file.size, mimetype: req.file.mimetype },
      });

      res.status(201).json({
        success: true,
        data: {
          url: publicUrl,
          filename: req.file.filename,
          size: req.file.size,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
