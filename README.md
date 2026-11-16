# gayz-ecommerce

A production-ready, premium South Asian Punjabi / Panjabi e-commerce foundation built with **Next.js (TypeScript + Tailwind CSS)**, **Express REST API**, and **PostgreSQL + Drizzle ORM**.

## Features

- **3 Switchable Storefront Designs Sharing One Backend & Database:**
  - **Design 1 — Luxury Minimal:** Warm alabaster & obsidian editorial fashion house aesthetic.
  - **Design 2 — Modern Premium:** High-contrast dark/light slate layout with rapid size quick-add.
  - **Design 3 — Traditional + Premium:** Ivory silk, royal oxblood, and antique zari gold with subtle geometric Jaali patterns.
- **Complete Customer Shopping Experience:** Homepage, filtered Product Listing & Search, Product Details with multi-angle gallery & live variant stock, persistent Cart & Drawer, coupon engine, 1-page Checkout (COD / bKash / Online Payment), Order Confirmation, and Live Order Tracking.
- **Transactional Inventory & Order Engine:** Conditional atomic SQL stock updates preventing overselling under concurrency, server-authoritative pricing & discounts, immutable order status history, and automatic stock restoration on cancellations or returns.
- **Analytics & Attribution:** Session/UTM traffic source tracking, 5-step conversion funnel, product view/dwell/add-to-cart/purchase matrix, conversion leak detector, smart restock recommendations, abandoned cart inspector, and search keyword analytics.
- **Admin Security & RBAC:** HTTP-only JWT cookies, bcrypt password hashing, password policy, login brute-force lockout, rate limiting, CSRF origin verification, magic-byte upload validation, 6 RBAC roles, and immutable audit logs.

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install
npm --prefix backend install
npm --prefix frontend install

# 2. Configure environment
cp backend/.env.example backend/.env

# 3. Seed database & run tests
npm --prefix backend run seed
npm --prefix backend test

# 4. Run Backend (port 4000) & Frontend (port 3005)
npm run dev
```

- **Storefront:** `http://localhost:3005`
- **Admin Studio:** `http://localhost:3005/admin` (Default Super Admin: `admin@qayz.com` / `Admin@12345!`)
- **Production Deployment Guide:** See [`DEPLOYMENT.md`](./DEPLOYMENT.md) and [`docker-compose.yml`](./docker-compose.yml).
