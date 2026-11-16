import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { AppError } from './error.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';
    cb(null, `qayz-${Date.now()}-${uuidv4().slice(0, 8)}${safeExt}`);
  },
});

export const uploadImageMiddleware = multer({
  storage,
  limits: {
    fileSize: env.maxUploadSizeBytes,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      cb(
        new AppError(
          400,
          'Only JPG, PNG, WebP, and AVIF image files are allowed',
          'INVALID_FILE_TYPE'
        )
      );
      return;
    }
    cb(null, true);
  },
});

/**
 * Inspect magic bytes of uploaded file to reject spoofed non-image payloads.
 */
export function verifyImageMagicBytes(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);

    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
    // PNG: 89 50 4E 47
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
    // WEBP: RIFF....WEBP
    if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return true;
    // AVIF: ....ftypavif
    if (buf.subarray(4, 8).toString('ascii') === 'ftyp') return true;

    return false;
  } catch {
    return false;
  }
}
