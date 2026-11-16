import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ALLOWED_ANALYTICS_EVENTS,
  recordAnalyticsEvent,
  upsertVisitorSession,
} from '../services/analytics.service.js';
import { AppError } from '../middleware/error.js';

const router = Router();

const sessionSchema = z.object({
  visitorId: z.string().min(4).max(120),
  sessionToken: z.string().min(4).max(120),
  referrer: z.string().max(500).optional(),
  landingPage: z.string().max(300).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(150).optional(),
  utmTerm: z.string().max(150).optional(),
  utmContent: z.string().max(150).optional(),
});

const eventSchema = z.object({
  sessionToken: z.string().max(120).optional(),
  visitorId: z.string().max(120).optional(),
  eventType: z.string().min(2).max(80),
  productId: z.number().int().positive().nullable().optional(),
  variantId: z.number().int().positive().nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  orderId: z.number().int().positive().nullable().optional(),
  cartId: z.number().int().positive().nullable().optional(),
  searchQuery: z.string().max(200).nullable().optional(),
  searchResultsCount: z.number().int().min(0).nullable().optional(),
  selectedSize: z.string().max(30).nullable().optional(),
  selectedColor: z.string().max(60).nullable().optional(),
  dwellTimeSeconds: z.number().int().min(0).max(36000).nullable().optional(),
  pagePath: z.string().max(300).optional(),
  metadata: z.record(z.unknown()).optional(),
});

router.post('/session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = sessionSchema.parse(req.body);
    const session = await upsertVisitorSession({
      ...body,
      userAgent: String(req.headers['user-agent'] || ''),
    });
    res.json({ success: true, data: { sessionId: session.id, trafficSource: session.trafficSource } });
  } catch (err) {
    next(err);
  }
});

router.post('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = eventSchema.parse(req.body);
    if (!ALLOWED_ANALYTICS_EVENTS.has(body.eventType)) {
      throw new AppError(400, `Unsupported analytics event type: ${body.eventType}`, 'INVALID_EVENT');
    }

    const ev = await recordAnalyticsEvent({
      ...body,
      userAgent: String(req.headers['user-agent'] || ''),
    });
    res.status(201).json({ success: true, data: { id: ev.id } });
  } catch (err) {
    next(err);
  }
});

export default router;
