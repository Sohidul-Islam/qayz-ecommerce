import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { generalApiLimiter, verifyCsrfOrigin } from './middleware/security.js';
import { errorHandler } from './middleware/error.js';

import productsRouter from './routes/products.routes.js';
import categoriesRouter from './routes/categories.routes.js';
import cartRouter from './routes/cart.routes.js';
import ordersRouter from './routes/orders.routes.js';
import analyticsRouter from './routes/analytics.routes.js';
import adminRouter from './routes/admin.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Strict CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Cart-Token', 'X-Requested-With'],
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(verifyCsrfOrigin);
  app.use('/api', generalApiLimiter);

  // Serve validated uploaded images securely
  app.use('/uploads', express.static(env.uploadDir, { maxAge: '7d' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      service: 'QAYZ Punjabi E-Commerce API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/products', productsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/delivery-zones', (req, res, next) => {
    req.url = '/delivery-zones';
    ordersRouter(req, res, next);
  });
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/admin', adminRouter);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'API endpoint not found',
      },
    });
  });

  app.use(errorHandler);
  return app;
}
