import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3005,http://127.0.0.1:3005')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3005',
  corsOrigins,
  jwtSecret: process.env.JWT_SECRET || 'qayz-dev-secret-change-in-production-min-32-chars',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  databaseUrl: process.env.DATABASE_URL || '',
  uploadDir: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || './uploads'),
  maxUploadSizeBytes: Number(process.env.MAX_UPLOAD_SIZE_MB || 5) * 1024 * 1024,
  isProduction: process.env.NODE_ENV === 'production',
};
