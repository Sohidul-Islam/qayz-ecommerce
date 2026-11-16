import { Router, Request, Response, NextFunction } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import {
  cartItems,
  carts,
  coupons,
  deliveryZones,
  inventory,
  productImages,
  products,
  productVariants,
} from '../db/schema.js';
import { AppError } from '../middleware/error.js';
import { calculateDiscountedUnitPrice } from '../services/inventory.service.js';
import { validateCouponAmount } from '../services/order.service.js';
import { recordAnalyticsEvent } from '../services/analytics.service.js';

const router = Router();

function getCartToken(req: Request, res: Response): string {
  const headerToken = req.headers['x-cart-token'];
  const cookieToken = req.cookies?.qayz_cart_token;
  let token =
    (typeof headerToken === 'string' && headerToken.trim()) ||
    (typeof cookieToken === 'string' && cookieToken.trim()) ||
    '';

  if (!token) {
    token = `cart_${uuidv4()}`;
    res.cookie('qayz_cart_token', token, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
  return token;
}

async function getOrCreateCart(token: string) {
  const existing = await db
    .select()
    .from(carts)
    .where(eq(carts.sessionToken, token))
    .limit(1);

  if (existing[0]) {
    if (existing[0].status === 'converted') {
      const [reopened] = await db
        .update(carts)
        .set({
          status: 'active',
          couponCode: null,
          checkoutStarted: false,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(carts.id, existing[0].id))
        .returning();
      return reopened;
    }
    return existing[0];
  }

  const [created] = await db
    .insert(carts)
    .values({
      sessionToken: token,
      status: 'active',
    })
    .returning();

  await recordAnalyticsEvent({
    eventType: 'Cart Created',
    cartId: created.id,
    pagePath: '/cart',
  });

  return created;
}

async function buildCartResponse(cart: typeof carts.$inferSelect) {
  const rows = await db
    .select({
      itemId: cartItems.id,
      quantity: cartItems.quantity,
      variantId: productVariants.id,
      sku: productVariants.sku,
      color: productVariants.color,
      colorHex: productVariants.colorHex,
      size: productVariants.size,
      priceOverride: productVariants.priceOverride,
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      basePrice: products.basePrice,
      discountType: products.discountType,
      discountValue: products.discountValue,
      availableStock: inventory.availableStock,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .innerJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(eq(cartItems.cartId, cart.id))
    .orderBy(asc(cartItems.id));

  const imgRows = await db.select().from(productImages).orderBy(asc(productImages.displayOrder));
  const imgMap = new Map<number, string>();
  for (const img of imgRows) {
    if (!imgMap.has(img.productId) || img.isPrimary) {
      imgMap.set(img.productId, img.url);
    }
  }

  let subtotal = 0;
  let itemCount = 0;
  const items = rows.map((r) => {
    const pricing = calculateDiscountedUnitPrice(
      r.basePrice,
      r.discountType,
      r.discountValue,
      r.priceOverride
    );
    const lineTotal = pricing.finalUnitPrice * r.quantity;
    subtotal += lineTotal;
    itemCount += r.quantity;

    return {
      id: r.itemId,
      productId: r.productId,
      variantId: r.variantId,
      productName: r.productName,
      productSlug: r.productSlug,
      sku: r.sku,
      color: r.color,
      colorHex: r.colorHex,
      size: r.size,
      imageUrl: imgMap.get(r.productId) || '/images/products/punjabi-1.svg',
      unitPrice: pricing.unitPrice,
      discountPerUnit: pricing.discountPerUnit,
      finalUnitPrice: pricing.finalUnitPrice,
      quantity: r.quantity,
      lineTotal,
      availableStock: r.availableStock ?? 0,
    };
  });

  let discountAmount = 0;
  let activeCouponCode: string | null = cart.couponCode;
  if (cart.couponCode && subtotal > 0) {
    const cRows = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, cart.couponCode))
      .limit(1);
    if (cRows[0]) {
      try {
        discountAmount = validateCouponAmount(cRows[0], subtotal);
      } catch {
        activeCouponCode = null;
      }
    } else {
      activeCouponCode = null;
    }
  }

  const zones = await db
    .select()
    .from(deliveryZones)
    .where(eq(deliveryZones.isActive, true))
    .orderBy(asc(deliveryZones.charge));
  const defaultZone = zones[0];
  const netAfterDiscount = Math.max(0, subtotal - discountAmount);
  let deliveryCharge = items.length > 0 ? defaultZone?.charge ?? 80 : 0;
  if (
    defaultZone?.freeShippingThreshold &&
    netAfterDiscount >= defaultZone.freeShippingThreshold
  ) {
    deliveryCharge = 0;
  }

  return {
    cartId: cart.id,
    sessionToken: cart.sessionToken,
    couponCode: activeCouponCode,
    items,
    itemCount,
    subtotal,
    discountAmount,
    deliveryCharge,
    total: netAfterDiscount + deliveryCharge,
  };
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getCartToken(req, res);
    const cart = await getOrCreateCart(token);
    const data = await buildCartResponse(cart);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

const addItemSchema = z.object({
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20).default(1),
  analyticsSessionToken: z.string().optional(),
  visitorId: z.string().optional(),
});

router.post('/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = addItemSchema.parse(req.body);
    const token = getCartToken(req, res);
    const cart = await getOrCreateCart(token);

    const vRows = await db
      .select({
        variantId: productVariants.id,
        productId: products.id,
        categoryId: products.categoryId,
        color: productVariants.color,
        size: productVariants.size,
        productActive: products.isActive,
        productArchived: products.isArchived,
        variantActive: productVariants.isActive,
        availableStock: inventory.availableStock,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
      .where(eq(productVariants.id, body.variantId))
      .limit(1);

    const v = vRows[0];
    if (!v || !v.productActive || v.productArchived || !v.variantActive) {
      throw new AppError(404, 'Product variant is unavailable', 'VARIANT_UNAVAILABLE');
    }

    const available = v.availableStock ?? 0;
    const existingItem = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, body.variantId)))
      .limit(1);

    const targetQty = (existingItem[0]?.quantity || 0) + body.quantity;
    if (targetQty > available) {
      throw new AppError(
        409,
        `Only ${available} unit(s) available for this size/color`,
        'INSUFFICIENT_STOCK'
      );
    }

    if (existingItem[0]) {
      await db
        .update(cartItems)
        .set({ quantity: targetQty, updatedAt: new Date() })
        .where(eq(cartItems.id, existingItem[0].id));
    } else {
      await db.insert(cartItems).values({
        cartId: cart.id,
        productId: v.productId,
        variantId: body.variantId,
        quantity: body.quantity,
      });
    }

    await db
      .update(carts)
      .set({ lastActivityAt: new Date(), updatedAt: new Date(), status: 'active' })
      .where(eq(carts.id, cart.id));

    await recordAnalyticsEvent({
      sessionToken: body.analyticsSessionToken || '',
      visitorId: body.visitorId || '',
      eventType: 'Add To Cart',
      productId: v.productId,
      variantId: v.variantId,
      categoryId: v.categoryId,
      cartId: cart.id,
      selectedColor: v.color,
      selectedSize: v.size,
      pagePath: '/cart',
      metadata: { quantity: body.quantity },
    });

    const data = await buildCartResponse(cart);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(1).max(50),
});

router.patch('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new AppError(400, 'Invalid cart item ID', 'INVALID_ID');
    }

    const body = updateItemSchema.parse(req.body);
    const token = getCartToken(req, res);
    const cart = await getOrCreateCart(token);

    const itemRows = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .limit(1);

    const item = itemRows[0];
    if (!item) {
      throw new AppError(404, 'Cart item not found', 'CART_ITEM_NOT_FOUND');
    }

    const invRows = await db
      .select({ availableStock: inventory.availableStock })
      .from(inventory)
      .where(eq(inventory.variantId, item.variantId))
      .limit(1);

    const available = invRows[0]?.availableStock ?? 0;
    if (body.quantity > available) {
      throw new AppError(409, `Only ${available} unit(s) available in stock`, 'INSUFFICIENT_STOCK');
    }

    await db
      .update(cartItems)
      .set({ quantity: body.quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, item.id));

    await db
      .update(carts)
      .set({ lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(carts.id, cart.id));

    await recordAnalyticsEvent({
      eventType: 'Quantity Changed',
      productId: item.productId,
      variantId: item.variantId,
      cartId: cart.id,
      pagePath: '/cart',
      metadata: { previousQuantity: item.quantity, newQuantity: body.quantity },
    });

    const data = await buildCartResponse(cart);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.delete('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = Number(req.params.id);
    const token = getCartToken(req, res);
    const cart = await getOrCreateCart(token);

    const existing = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .limit(1);

    if (existing[0]) {
      await db.delete(cartItems).where(eq(cartItems.id, itemId));
      await db
        .update(carts)
        .set({ lastActivityAt: new Date(), updatedAt: new Date() })
        .where(eq(carts.id, cart.id));

      await recordAnalyticsEvent({
        eventType: 'Remove From Cart',
        productId: existing[0].productId,
        variantId: existing[0].variantId,
        cartId: cart.id,
        pagePath: '/cart',
      });
    }

    const data = await buildCartResponse(cart);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/coupon', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = z.object({ code: z.string().max(40) }).parse(req.body);
    const token = getCartToken(req, res);
    const cart = await getOrCreateCart(token);

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      await db
        .update(carts)
        .set({ couponCode: null, updatedAt: new Date() })
        .where(eq(carts.id, cart.id));
      const updatedCart = { ...cart, couponCode: null };
      const data = await buildCartResponse(updatedCart);
      res.json({ success: true, data });
      return;
    }

    const couponRows = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, cleanCode))
      .limit(1);
    const coupon = couponRows[0];
    if (!coupon) {
      throw new AppError(400, `Coupon '${cleanCode}' not found`, 'INVALID_COUPON');
    }

    const currentData = await buildCartResponse(cart);
    validateCouponAmount(coupon, currentData.subtotal);

    await db
      .update(carts)
      .set({ couponCode: cleanCode, lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(carts.id, cart.id));

    const data = await buildCartResponse({ ...cart, couponCode: cleanCode });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/checkout-intent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = z
      .object({
        customerName: z.string().max(120).optional(),
        customerPhone: z.string().max(30).optional(),
        customerEmail: z.string().email().optional().or(z.literal('')),
        checkoutStarted: z.boolean().optional(),
      })
      .parse(req.body);

    const token = getCartToken(req, res);
    const cart = await getOrCreateCart(token);

    await db
      .update(carts)
      .set({
        ...(body.customerName ? { customerName: body.customerName } : {}),
        ...(body.customerPhone ? { customerPhone: body.customerPhone } : {}),
        ...(body.customerEmail ? { customerEmail: body.customerEmail } : {}),
        ...(body.checkoutStarted !== undefined ? { checkoutStarted: body.checkoutStarted } : {}),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cart.id));

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;

