# Qayz-ecommerce

QAYZ — Modern, Minimal & Premium South Asian Punjabi/Panjabi E-Commerce Platform featuring **3 switchable homepage designs** (`Luxury Minimal`, `Modern Premium`, and `Traditional + Premium`) backed by a single Express + PostgreSQL/Drizzle REST API, transactional inventory/order consistency, RBAC admin dashboard, and privacy-conscious analytics.

## Features

- **3 Switchable Design Samples:** Instant 1-click toggle between Design 1 (Luxury Minimal), Design 2 (Modern Premium), and Design 3 (Traditional + Premium) sharing one database, cart, checkout, and admin panel.
- **Storefront:** Product listing with category/size/color/price/stock filters, live search, product detail gallery with variant availability, cart drawer & page, streamlined checkout (COD / bKash / Online Payment ready), order confirmation, and live order tracking.
- **Inventory & Order Consistency:** Transactional stock validation & deduction preventing overselling under concurrency, server-authoritative pricing & coupons, immutable `order_status_history` and `inventory_transactions`, and automatic stock restoration on cancellations/returns.
- **Analytics & Attribution:** Session/UTM/traffic-source attribution, 5-step conversion funnel, product conversion leak detector, smart restock recommendations, abandoned cart inspector, and search keyword / zero-result analytics.
- **Admin Security (RBAC):** Bcrypt password hashing, strong password policy, brute-force lockout, HTTP-only JWT cookies, rate limiting, CSRF origin checks, magic-byte upload validation, 6 roles, and immutable audit logs.

## Quickstart

```bash
# 1. Install dependencies
npm install
npm --prefix backend install
npm --prefix frontend install

# 2. Configure environment (optional; defaults to embedded persistent PostgreSQL via PGlite)
cp backend/.env.example backend/.env

# 3. Seed realistic demo catalog, orders & analytics
npm --prefix backend run seed

# 4. Run tests
npm --prefix backend test

# 5. Start development servers (Backend :4000, Frontend :3005)
npm run dev
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Docker Compose, VPS (Nginx + PM2), Managed PostgreSQL/Supabase, CDN, and Object Storage instructions.
