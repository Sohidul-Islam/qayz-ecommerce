import { Router, Request, Response, NextFunction } from 'express';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  categories,
  inventory,
  inventoryTransactions,
  productImages,
  products,
  productVariants,
} from '../db/schema.js';
import { requireAdminAuth, requirePermission } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { sanitizeText } from '../middleware/security.js';
import { recordAuditLog } from '../services/audit.service.js';
import { calculateDiscountedUnitPrice } from '../services/inventory.service.js';

const router = Router();

const productImageInputSchema = z.object({
  url: z.string().min(1).max(500),
  altText: z.string().max(250).optional().default(''),
  displayOrder: z.number().int().min(0).optional().default(0),
  isPrimary: z.boolean().optional().default(false),
});

const productVariantInputSchema = z.object({
  id: z.number().int().positive().optional(),
  sku: z.string().min(2).max(80),
  color: z.string().min(1).max(60),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{3,8}$/).optional().default('#111827'),
  size: z.string().min(1).max(20),
  priceOverride: z.number().int().positive().nullable().optional(),
  initialStock: z.number().int().min(0).optional().default(10),
  lowStockThreshold: z.number().int().min(0).optional().default(5),
  isActive: z.boolean().optional().default(true),
});

const productCreateSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
  subtitle: z.string().max(250).optional().default(''),
  description: z.string().min(5).max(5000),
  categoryId: z.number().int().positive(),
  basePrice: z.number().int().positive(),
  discountType: z.enum(['none', 'percentage', 'fixed']).optional().default('none'),
  discountValue: z.number().int().min(0).optional().default(0),
  fabric: z.string().max(150).optional().default('Pure Cotton'),
  fit: z.string().max(150).optional().default('Tailored Regular Fit'),
  careInstructions: z.string().max(500).optional().default('Dry clean or gentle cold wash'),
  craftDetails: z.string().max(1000).optional().default(''),
  tags: z.array(z.string().max(50)).optional().default([]),
  isFeatured: z.boolean().optional().default(false),
  isBestSeller: z.boolean().optional().default(false),
  isNewArrival: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  seoTitle: z.string().max(200).optional().default(''),
  seoDescription: z.string().max(500).optional().default(''),
  images: z.array(productImageInputSchema).min(1),
  variants: z.array(productVariantInputSchema).min(1),
});

const productUpdateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  subtitle: z.string().max(250).optional(),
  description: z.string().min(5).max(5000).optional(),
  categoryId: z.number().int().positive().optional(),
  basePrice: z.number().int().positive().optional(),
  discountType: z.enum(['none', 'percentage', 'fixed']).optional(),
  discountValue: z.number().int().min(0).optional(),
  fabric: z.string().max(150).optional(),
  fit: z.string().max(150).optional(),
  careInstructions: z.string().max(500).optional(),
  craftDetails: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).optional(),
  isFeatured: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(500).optional(),
  images: z.array(productImageInputSchema).optional(),
  variants: z.array(productVariantInputSchema).optional(),
});

async function hydrateProducts(productRows: Array<typeof products.$inferSelect>) {
  if (productRows.length === 0) return [];
  const productIds = productRows.map((p) => p.id);

  const [catRows, imageRows, variantRows] = await Promise.all([
    db.select().from(categories),
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.displayOrder), asc(productImages.id)),
    db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        sku: productVariants.sku,
        color: productVariants.color,
        colorHex: productVariants.colorHex,
        size: productVariants.size,
        priceOverride: productVariants.priceOverride,
        isActive: productVariants.isActive,
        currentStock: inventory.currentStock,
        reservedStock: inventory.reservedStock,
        availableStock: inventory.availableStock,
        soldQuantity: inventory.soldQuantity,
        lowStockThreshold: inventory.lowStockThreshold,
      })
      .from(productVariants)
      .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
      .where(inArray(productVariants.productId, productIds))
      .orderBy(asc(productVariants.id)),
  ]);

  const catMap = new Map(catRows.map((c) => [c.id, c]));

  return productRows.map((p) => {
    const imgs = imageRows.filter((i) => i.productId === p.id);
    const vars = variantRows
      .filter((v) => v.productId === p.id)
      .map((v) => {
        const pricing = calculateDiscountedUnitPrice(
          p.basePrice,
          p.discountType,
          p.discountValue,
          v.priceOverride
        );
        return {
          ...v,
          currentStock: v.currentStock ?? 0,
          reservedStock: v.reservedStock ?? 0,
          availableStock: v.availableStock ?? 0,
          soldQuantity: v.soldQuantity ?? 0,
          lowStockThreshold: v.lowStockThreshold ?? 5,
          unitPrice: pricing.unitPrice,
          finalPrice: pricing.finalUnitPrice,
        };
      });

    const basePricing = calculateDiscountedUnitPrice(
      p.basePrice,
      p.discountType,
      p.discountValue,
      null
    );

    const totalAvailableStock = vars
      .filter((v) => v.isActive)
      .reduce((acc, v) => acc + v.availableStock, 0);
    const totalSold = vars.reduce((acc, v) => acc + v.soldQuantity, 0);
    const colors = Array.from(
      new Map(vars.map((v) => [v.color, { name: v.color, hex: v.colorHex }])).values()
    );
    const sizes = Array.from(new Set(vars.map((v) => v.size)));
    const primaryImage = imgs.find((i) => i.isPrimary) || imgs[0] || null;
    const category = catMap.get(p.categoryId) || null;

    return {
      ...p,
      categoryName: category?.name || 'Punjabi',
      categorySlug: category?.slug || '',
      finalPrice: basePricing.finalUnitPrice,
      discountAmountPerUnit: basePricing.discountPerUnit,
      primaryImage: primaryImage?.url || '/images/products/punjabi-1.svg',
      images: imgs,
      variants: vars,
      colors,
      sizes,
      totalAvailableStock,
      inStock: totalAvailableStock > 0,
      totalSold,
    };
  });
}

// Public & Admin Product Listing
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      size,
      color,
      inStock,
      featured,
      bestSeller,
      newArrival,
      search,
      sort = 'featured',
      page = '1',
      limit = '12',
      includeArchived = 'false',
    } = req.query as Record<string, string | undefined>;

    const showArchived = includeArchived === 'true';

    const allCats = await db.select().from(categories);
    const catBySlug = new Map(allCats.map((c) => [c.slug, c.id]));

    const rawProducts = await db.select().from(products).orderBy(desc(products.createdAt));
    const hydrated = await hydrateProducts(rawProducts);

    let filtered = hydrated.filter((p) => {
      if (!showArchived && (p.isArchived || !p.isActive)) return false;
      if (category && category !== 'all') {
        const targetCatId = catBySlug.get(category) ?? Number(category);
        if (p.categoryId !== targetCatId) return false;
      }
      if (minPrice && p.finalPrice < Number(minPrice)) return false;
      if (maxPrice && p.finalPrice > Number(maxPrice)) return false;
      if (size && size !== 'all') {
        const hasSize = p.variants.some(
          (v) => v.size.toLowerCase() === size.toLowerCase() && v.availableStock > 0
        );
        if (!hasSize) return false;
      }
      if (color && color !== 'all') {
        const hasColor = p.variants.some(
          (v) => v.color.toLowerCase() === color.toLowerCase()
        );
        if (!hasColor) return false;
      }
      if (inStock === 'true' && !p.inStock) return false;
      if (featured === 'true' && !p.isFeatured) return false;
      if (bestSeller === 'true' && !p.isBestSeller) return false;
      if (newArrival === 'true' && !p.isNewArrival) return false;
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${p.name} ${p.subtitle} ${p.description} ${p.fabric} ${p.categoryName} ${p.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // Sorting
    if (sort === 'price_asc') {
      filtered.sort((a, b) => a.finalPrice - b.finalPrice);
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => b.finalPrice - a.finalPrice);
    } else if (sort === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'best_selling') {
      filtered.sort((a, b) => b.totalSold - a.totalSold);
    } else {
      filtered.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.totalSold - a.totalSold);
    }

    // Facets across active catalog
    const activeCatalog = hydrated.filter((p) => !p.isArchived && p.isActive);
    const availableSizes = Array.from(new Set(activeCatalog.flatMap((p) => p.sizes)));
    const availableColors = Array.from(
      new Map(activeCatalog.flatMap((p) => p.colors).map((c) => [c.name, c])).values()
    );

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 12));
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    const offset = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
      facets: {
        sizes: availableSizes,
        colors: availableColors,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Product Detail by ID or Slug
router.get('/:idOrSlug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const param = String(req.params.idOrSlug);
    const isNumeric = /^\d+$/.test(param);

    const rows = await db
      .select()
      .from(products)
      .where(isNumeric ? eq(products.id, Number(param)) : eq(products.slug, param))
      .limit(1);

    const product = rows[0];
    if (!product || product.isArchived) {
      throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    const [hydrated] = await hydrateProducts([product]);

    // Related & Recommended products
    const allActive = await db
      .select()
      .from(products)
      .where(eq(products.isArchived, false));
    const hydratedOthers = await hydrateProducts(
      allActive.filter((p) => p.id !== product.id && p.isActive)
    );

    const related = hydratedOthers
      .filter((p) => p.categoryId === product.categoryId)
      .slice(0, 4);
    const recommended = hydratedOthers
      .filter((p) => p.categoryId !== product.categoryId)
      .sort((a, b) => Number(b.isBestSeller) - Number(a.isBestSeller))
      .slice(0, 4);

    res.json({
      success: true,
      data: {
        ...hydrated,
        relatedProducts: related,
        recommendedProducts: recommended,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Admin Create Product
router.post(
  '/',
  requireAdminAuth,
  requirePermission('products.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = productCreateSchema.parse(req.body);

      const existingSlug = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.slug, body.slug))
        .limit(1);

      if (existingSlug[0]) {
        throw new AppError(409, 'A product with this slug already exists', 'SLUG_CONFLICT');
      }

      const createdId = await db.transaction(async (tx) => {
        const [prod] = await tx
          .insert(products)
          .values({
            name: sanitizeText(body.name),
            slug: body.slug,
            subtitle: sanitizeText(body.subtitle),
            description: sanitizeText(body.description),
            categoryId: body.categoryId,
            basePrice: body.basePrice,
            discountType: body.discountType,
            discountValue: body.discountValue,
            fabric: sanitizeText(body.fabric),
            fit: sanitizeText(body.fit),
            careInstructions: sanitizeText(body.careInstructions),
            craftDetails: sanitizeText(body.craftDetails),
            tags: body.tags.map(sanitizeText),
            isFeatured: body.isFeatured,
            isBestSeller: body.isBestSeller,
            isNewArrival: body.isNewArrival,
            isActive: body.isActive,
            seoTitle: sanitizeText(body.seoTitle || body.name),
            seoDescription: sanitizeText(body.seoDescription || body.subtitle),
          })
          .returning();

        for (let i = 0; i < body.images.length; i++) {
          const img = body.images[i];
          await tx.insert(productImages).values({
            productId: prod.id,
            url: img.url,
            altText: sanitizeText(img.altText || prod.name),
            displayOrder: img.displayOrder ?? i,
            isPrimary: img.isPrimary || i === 0,
          });
        }

        for (const v of body.variants) {
          const [variant] = await tx
            .insert(productVariants)
            .values({
              productId: prod.id,
              sku: v.sku.toUpperCase().trim(),
              color: sanitizeText(v.color),
              colorHex: v.colorHex,
              size: sanitizeText(v.size),
              priceOverride: v.priceOverride ?? null,
              isActive: v.isActive,
            })
            .returning();

          const [inv] = await tx
            .insert(inventory)
            .values({
              variantId: variant.id,
              currentStock: v.initialStock,
              reservedStock: 0,
              availableStock: v.initialStock,
              soldQuantity: 0,
              lowStockThreshold: v.lowStockThreshold,
            })
            .returning();

          if (v.initialStock > 0) {
            await tx.insert(inventoryTransactions).values({
              variantId: variant.id,
              inventoryId: inv.id,
              changeAmount: v.initialStock,
              previousStock: 0,
              newStock: v.initialStock,
              reason: 'Initial Stock',
              referenceType: 'product_creation',
              referenceId: String(prod.id),
              note: 'Initial variant inventory on product creation',
              performedByAdminId: req.admin!.id,
            });
          }
        }

        return prod.id;
      });

      const createdRows = await db.select().from(products).where(eq(products.id, createdId)).limit(1);
      const [hydrated] = await hydrateProducts(createdRows);

      await recordAuditLog({
        req,
        action: 'Product Created',
        resource: 'product',
        resourceId: createdId,
        newValue: { name: hydrated.name, slug: hydrated.slug, basePrice: hydrated.basePrice },
      });

      res.status(201).json({ success: true, data: hydrated });
    } catch (err) {
      next(err);
    }
  }
);

// Admin Update Product
router.patch(
  '/:id',
  requireAdminAuth,
  requirePermission('products.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(400, 'Invalid product ID', 'INVALID_ID');
      }

      const body = productUpdateSchema.parse(req.body);
      const existingRows = await db.select().from(products).where(eq(products.id, id)).limit(1);
      const existing = existingRows[0];
      if (!existing) {
        throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
      }

      await db.transaction(async (tx) => {
        await tx
          .update(products)
          .set({
            ...(body.name !== undefined ? { name: sanitizeText(body.name) } : {}),
            ...(body.slug !== undefined ? { slug: body.slug } : {}),
            ...(body.subtitle !== undefined ? { subtitle: sanitizeText(body.subtitle) } : {}),
            ...(body.description !== undefined ? { description: sanitizeText(body.description) } : {}),
            ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
            ...(body.basePrice !== undefined ? { basePrice: body.basePrice } : {}),
            ...(body.discountType !== undefined ? { discountType: body.discountType } : {}),
            ...(body.discountValue !== undefined ? { discountValue: body.discountValue } : {}),
            ...(body.fabric !== undefined ? { fabric: sanitizeText(body.fabric) } : {}),
            ...(body.fit !== undefined ? { fit: sanitizeText(body.fit) } : {}),
            ...(body.careInstructions !== undefined
              ? { careInstructions: sanitizeText(body.careInstructions) }
              : {}),
            ...(body.craftDetails !== undefined
              ? { craftDetails: sanitizeText(body.craftDetails) }
              : {}),
            ...(body.tags !== undefined ? { tags: body.tags.map(sanitizeText) } : {}),
            ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
            ...(body.isBestSeller !== undefined ? { isBestSeller: body.isBestSeller } : {}),
            ...(body.isNewArrival !== undefined ? { isNewArrival: body.isNewArrival } : {}),
            ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
            ...(body.isArchived !== undefined ? { isArchived: body.isArchived } : {}),
            ...(body.seoTitle !== undefined ? { seoTitle: sanitizeText(body.seoTitle) } : {}),
            ...(body.seoDescription !== undefined
              ? { seoDescription: sanitizeText(body.seoDescription) }
              : {}),
            updatedAt: new Date(),
          })
          .where(eq(products.id, id));

        if (body.images) {
          await tx.delete(productImages).where(eq(productImages.productId, id));
          for (let i = 0; i < body.images.length; i++) {
            const img = body.images[i];
            await tx.insert(productImages).values({
              productId: id,
              url: img.url,
              altText: sanitizeText(img.altText || body.name || existing.name),
              displayOrder: img.displayOrder ?? i,
              isPrimary: img.isPrimary || i === 0,
            });
          }
        }

        if (body.variants) {
          for (const v of body.variants) {
            if (v.id) {
              await tx
                .update(productVariants)
                .set({
                  sku: v.sku.toUpperCase().trim(),
                  color: sanitizeText(v.color),
                  colorHex: v.colorHex,
                  size: sanitizeText(v.size),
                  priceOverride: v.priceOverride ?? null,
                  isActive: v.isActive,
                  updatedAt: new Date(),
                })
                .where(eq(productVariants.id, v.id));
            } else {
              const [newVar] = await tx
                .insert(productVariants)
                .values({
                  productId: id,
                  sku: v.sku.toUpperCase().trim(),
                  color: sanitizeText(v.color),
                  colorHex: v.colorHex,
                  size: sanitizeText(v.size),
                  priceOverride: v.priceOverride ?? null,
                  isActive: v.isActive,
                })
                .returning();

              const [inv] = await tx
                .insert(inventory)
                .values({
                  variantId: newVar.id,
                  currentStock: v.initialStock,
                  reservedStock: 0,
                  availableStock: v.initialStock,
                  soldQuantity: 0,
                  lowStockThreshold: v.lowStockThreshold,
                })
                .returning();

              if (v.initialStock > 0) {
                await tx.insert(inventoryTransactions).values({
                  variantId: newVar.id,
                  inventoryId: inv.id,
                  changeAmount: v.initialStock,
                  previousStock: 0,
                  newStock: v.initialStock,
                  reason: 'Initial Stock',
                  referenceType: 'variant_creation',
                  referenceId: String(id),
                  note: 'Initial stock for newly added variant',
                  performedByAdminId: req.admin!.id,
                });
              }
            }
          }
        }
      });

      const updatedRows = await db.select().from(products).where(eq(products.id, id)).limit(1);
      const [hydrated] = await hydrateProducts(updatedRows);

      await recordAuditLog({
        req,
        action: 'Product Updated',
        resource: 'product',
        resourceId: id,
        previousValue: { name: existing.name, basePrice: existing.basePrice, isActive: existing.isActive },
        newValue: { name: hydrated.name, basePrice: hydrated.basePrice, isActive: hydrated.isActive },
      });

      res.json({ success: true, data: hydrated });
    } catch (err) {
      next(err);
    }
  }
);

// Admin Soft-Delete / Archive Product (never permanently deletes important product records)
router.delete(
  '/:id',
  requireAdminAuth,
  requirePermission('products.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(400, 'Invalid product ID', 'INVALID_ID');
      }

      const existingRows = await db.select().from(products).where(eq(products.id, id)).limit(1);
      const existing = existingRows[0];
      if (!existing) {
        throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
      }

      const [archived] = await db
        .update(products)
        .set({
          isArchived: true,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      await recordAuditLog({
        req,
        action: 'Product Archived',
        resource: 'product',
        resourceId: id,
        previousValue: { isArchived: existing.isArchived, isActive: existing.isActive },
        newValue: { isArchived: true, isActive: false },
      });

      res.json({
        success: true,
        message: 'Product archived successfully',
        data: archived,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
