import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again shortly.',
    },
  },
});

export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
    },
  },
});

export const orderCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'ORDER_RATE_LIMITED',
      message: 'Too many order submissions. Please wait a moment.',
    },
  },
});

/**
 * Origin-based CSRF protection for cookie-authenticated state-changing requests.
 */
export function verifyCsrfOrigin(req: Request, res: Response, next: NextFunction): void {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  // Only enforce strict origin check when browser sends Origin or Referer with cookies
  const origin = req.headers.origin;
  if (origin && !env.corsOrigins.includes(origin)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_ORIGIN_MISMATCH',
        message: 'Cross-origin request blocked by security policy',
      },
    });
    return;
  }

  next();
}

export function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/\u0000/g, '')
    .trim();
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

