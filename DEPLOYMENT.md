# QAYZ Punjabi E-Commerce Platform — Deployment & Infrastructure Guide

This guide covers deploying QAYZ across **Docker**, **Linux VPS (Nginx + PM2)**, **Managed PostgreSQL / Supabase**, **CDN**, and **Object Storage**.

---

## 1. Environment Variables

### Backend (`backend/.env`)

```env
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://shop.yourdomain.com
CORS_ORIGINS=https://shop.yourdomain.com,https://www.shop.yourdomain.com
JWT_SECRET=<generate-64-byte-hex-secret>
JWT_EXPIRES_IN=7d
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/qayz?sslmode=require
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=5
```

> **Note:** Leaving `DATABASE_URL` empty runs an embedded persistent PostgreSQL 16 engine (`@electric-sql/pglite` stored in `backend/data/pgdata`) suitable for single-node local evaluation. For multi-worker production, always set `DATABASE_URL` to a managed PostgreSQL or Supabase instance.

### Frontend (`frontend/.env.local`)

```env
INTERNAL_BACKEND_URL=http://127.0.0.1:4000
NEXT_PUBLIC_SITE_URL=https://shop.yourdomain.com
```

---

## 2. Docker Compose Deployment (Recommended)

```bash
export POSTGRES_PASSWORD="strong-db-password"
export JWT_SECRET="$(openssl rand -hex 32)"
export FRONTEND_URL="https://shop.yourdomain.com"
export CORS_ORIGINS="https://shop.yourdomain.com"

docker compose up -d --build
```

The backend container automatically executes schema migrations (`runMigrations()`) and seeds initial RBAC roles/settings on first empty boot (`seedDatabaseIfEmpty()`).

---

## 3. VPS Deployment (Ubuntu + Nginx + PM2)

### A. Build Applications

```bash
# Install Node 22 LTS
npm --prefix backend ci && npm --prefix backend run build
npm --prefix frontend ci && npm --prefix frontend run build

# Initialize DB & Seed
npm --prefix backend run migrate
npm --prefix backend run seed
```

### B. Process Management (PM2)

```bash
npm install -g pm2
pm2 start backend/dist/index.js --name qayz-api
pm2 start "npm --prefix frontend run start" --name qayz-web
pm2 save && pm2 startup
```

### C. Nginx Reverse Proxy + TLS

```nginx
server {
    listen 80;
    server_name shop.yourdomain.com;

    client_max_body_size 10M;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:4000/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable HTTPS via Certbot: `sudo certbot --nginx -d shop.yourdomain.com`.

---

## 4. Cloud / Supabase / CDN / Object Storage Scaling

- **Database (Supabase / AWS RDS / Neon):** Set `DATABASE_URL` to your PostgreSQL connection string (`postgresql://...`). Drizzle ORM uses `node-postgres` pooling automatically.
- **Object Storage (S3 / Cloudflare R2):** Product uploads pass binary magic-byte verification in `backend/src/middleware/upload.ts`. To offload images to S3/R2, replace the disk save step in `POST /api/admin/upload` with `@aws-sdk/client-s3` and return the CDN URL.
- **CDN (Cloudflare):** Place Cloudflare in front of your domain to cache `/images/*`, `/uploads/*`, and `/_next/static/*` while keeping `/api/*` and `/admin/*` dynamic (`Cache-Control: no-store`).
- **Payment Gateways:** `backend/src/services/order.service.ts` records a provider-agnostic `payments` row (`cod`, `bkash_checkout`, `sslcommerz_gateway`). Wire webhook verification callbacks in `backend/src/routes/orders.routes.ts` when activating live merchant credentials.
- **Notifications:** Register Nodemailer/Resend/Twilio/Meta WhatsApp providers inside `backend/src/services/notification.service.ts`.

---

## 5. Default Admin Credentials (Change Before Launch)

- **Super Admin:** `admin@qayz.com` / `Admin@12345!`
- **Order Manager:** `orders@qayz.com` / `Admin@12345!`
- **Inventory Manager:** `inventory@qayz.com` / `Admin@12345!`
- **Content Manager:** `content@qayz.com` / `Admin@12345!`
- **Analytics Viewer:** `analytics@qayz.com` / `Admin@12345!`
