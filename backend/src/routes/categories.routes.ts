import { Router, Request, Response, NextFunction } from 'express';
import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { categories, products } from '../db/schema.js';
import { requireAdminAuth, requirePermission } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { sanitizeText } from '../middleware/security.js';
import { recordAuditLog } from '../services/audit.service.js';

const router = Router();

const categoryCreateSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional().default(''),
  imageUrl: z.string().max(500).optional().default(''),
  displayOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const categoryUpdateSchema = categoryCreateSchema.partial();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const allCats = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.displayOrder), asc(categories.id));

    const prodCounts = await db
      .select({
        categoryId: products.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(products)
      .where(eq(products.isArchived, false))
      .groupBy(products.categoryId);

    const countMap = new Map(prodCounts.map((p) => [p.categoryId, p.count]));

    const filtered = includeInactive ? allCats : allCats.filter((c) => c.isActive);
    res.json({
      success: true,
      data: filtered.map((c) => ({
        ...c,
        productCount: countMap.get(c.id) || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireAdminAuth,
  requirePermission('products.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = categoryCreateSchema.parse(req.body);
      const existing = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, body.slug))
        .limit(1);

      if (existing[0]) {
        throw new AppError(409, 'Category slug already exists', 'SLUG_CONFLICT');
      }

      const [created] = await db
        .insert(categories)
        .values({
          name: sanitizeText(body.name),
          slug: body.slug,
          description: sanitizeText(body.description),
          imageUrl: body.imageUrl,
          displayOrder: body.displayOrder,
          isActive: body.isActive,
        })
        .returning();

      await recordAuditLog({
        req,
        action: 'Category Created',
        resource: 'category',
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
  '/:id',
  requireAdminAuth,
  requirePermission('products.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(400, 'Invalid category ID', 'INVALID_ID');
      }

      const body = categoryUpdateSchema.parse(req.body);
      const existingRows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
      const existing = existingRows[0];
      if (!existing) {
        throw new AppError(404, 'Category not found', 'NOT_FOUND');
      }

      const [updated] = await db
        .update(categories)
        .set({
          ...(body.name !== undefined ? { name: sanitizeText(body.name) } : {}),
          ...(body.slug !== undefined ? { slug: body.slug } : {}),
          ...(body.description !== undefined ? { description: sanitizeText(body.description) } : {}),
          ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
          ...(body.displayOrder !== undefined ? { displayOrder: body.displayOrder } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          updatedAt: new Date(),
        })
        .where(eq(categories.id, id))
        .returning();

      await recordAuditLog({
        req,
        action: 'Category Updated',
        resource: 'category',
        resourceId: id,
        previousValue: existing as unknown as Record<string, unknown>,
        newValue: updated as unknown as Record<string, unknown>,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

