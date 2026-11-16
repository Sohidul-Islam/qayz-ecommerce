import { Router, Request, Response, NextFunction } from 'express';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { deliveryZones } from '../db/schema.js';
import { orderCreateLimiter, sanitizeText } from '../middleware/security.js';
import {
  createOrder,
  getOrderDetailsByNumber,
  VALID_PAYMENT_METHODS,
} from '../services/order.service.js';

const router = Router();

const createOrderSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().min(6).max(25),
  customerEmail: z.string().email().optional().or(z.literal('')),
  deliveryAddress: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  area: z.string().min(2).max(100),
  postalCode: z.string().max(20).optional().default(''),
  deliveryInstructions: z.string().max(500).optional().default(''),
  deliveryZoneId: z.number().int().positive().optional(),
  paymentMethod: z.enum(VALID_PAYMENT_METHODS).default('cod'),
  couponCode: z.string().max(40).optional(),
  cartSessionToken: z.string().optional(),
  analyticsSessionToken: z.string().optional(),
  visitorId: z.string().optional(),
  items: z
    .array(
      z.object({
        variantId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(50),
      })
    )
    .optional()
    .default([]),
});

router.get('/delivery-zones', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const zones = await db
      .select()
      .from(deliveryZones)
      .where(eq(deliveryZones.isActive, true))
      .orderBy(asc(deliveryZones.charge));
    res.json({ success: true, data: zones });
  } catch (err) {
    next(err);
  }
});

router.post('/', orderCreateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createOrderSchema.parse(req.body);
    const cartToken =
      body.cartSessionToken ||
      (typeof req.headers['x-cart-token'] === 'string' ? req.headers['x-cart-token'] : undefined) ||
      req.cookies?.qayz_cart_token;

    const result = await createOrder({
      customerName: sanitizeText(body.customerName),
      customerPhone: sanitizeText(body.customerPhone),
      customerEmail: body.customerEmail ? body.customerEmail.trim() : undefined,
      deliveryAddress: sanitizeText(body.deliveryAddress),
      city: sanitizeText(body.city),
      area: sanitizeText(body.area),
      postalCode: sanitizeText(body.postalCode || ''),
      deliveryInstructions: sanitizeText(body.deliveryInstructions || ''),
      deliveryZoneId: body.deliveryZoneId,
      paymentMethod: body.paymentMethod,
      couponCode: body.couponCode ? body.couponCode.trim().toUpperCase() : undefined,
      cartSessionToken: cartToken,
      analyticsSessionToken: body.analyticsSessionToken,
      visitorId: body.visitorId,
      items: body.items,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:orderNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const phone = typeof req.query.phone === 'string' ? req.query.phone : undefined;
    const order = await getOrderDetailsByNumber(String(req.params.orderNumber), phone);
    // Strip internal admin notes from public order lookup
    const { internalNotes: _hidden, ...publicOrder } = order;
    res.json({ success: true, data: publicOrder });
  } catch (err) {
    next(err);
  }
});

export default router;
