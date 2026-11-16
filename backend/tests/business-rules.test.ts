import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';

// Force isolated in-memory PGlite for automated tests before importing db/app
process.env.PGLITE_DATA_DIR = 'memory://';
process.env.DATABASE_URL = '';

import { createApp } from '../src/app.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedDatabaseIfEmpty } from '../src/db/seed.js';
import { closeDb, db } from '../src/db/index.js';
import { inventory } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

const app = createApp();

let superAdminToken = '';
let analyticsViewerToken = '';
let testVariantId = 0;
let lowStockVariantId = 0;
let archivedProductId = 0;

describe('QAYZ Backend Business Rules, Security & Inventory Consistency', () => {
  beforeAll(async () => {
    await runMigrations();
    await seedDatabaseIfEmpty(true);

    const adminRes = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@qayz.com',
      password: 'Admin@12345!',
    });
    expect(adminRes.status).toBe(200);
    superAdminToken = adminRes.body.data.token;

    const viewerRes = await request(app).post('/api/admin/auth/login').send({
      email: 'analytics@qayz.com',
      password: 'Admin@12345!',
    });
    expect(viewerRes.status).toBe(200);
    analyticsViewerToken = viewerRes.body.data.token;

    const prodRes = await request(app).get('/api/products?limit=20');
    expect(prodRes.status).toBe(200);
    const zafar = prodRes.body.data.find(
      (p: { slug: string }) => p.slug === 'zafar-obsidian-zari-silk-panjabi'
    );
    expect(zafar).toBeDefined();
    testVariantId = zafar.variants[0].id;
    // Find XL variant with stock 4
    const xlVar = zafar.variants.find((v: { size: string }) => v.size === 'XL');
    lowStockVariantId = xlVar.id;

    const rayan = prodRes.body.data.find(
      (p: { slug: string }) => p.slug === 'rayan-sandwashed-belgian-linen-panjabi'
    );
    archivedProductId = rayan.id;
  });

  afterAll(async () => {
    await closeDb();
  });

  it('enforces RBAC: blocks unauthenticated & analytics_viewer from mutating products or orders', async () => {
    const unauth = await request(app).get('/api/admin/orders');
    expect(unauth.status).toBe(401);

    const viewerMutateProduct = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${analyticsViewerToken}`)
      .send({
        name: 'Unauthorized Panjabi',
        slug: 'unauthorized-panjabi',
        description: 'Should be rejected by RBAC',
        categoryId: 1,
        basePrice: 4000,
        images: [{ url: '/images/products/punjabi-1.png' }],
        variants: [{ sku: 'UNAUTH-1', color: 'Black', size: 'M', initialStock: 5 }],
      });
    expect(viewerMutateProduct.status).toBe(403);

    const viewerOrders = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${analyticsViewerToken}`);
    expect(viewerOrders.status).toBe(200);
  });

  it('calculates prices, discounts, and delivery server-side ignoring tampered client values', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Server Price Check',
        customerPhone: '01700998877',
        deliveryAddress: 'House 12, Road 4, Banani',
        city: 'Dhaka',
        area: 'Banani',
        paymentMethod: 'cod',
        couponCode: 'ROYAL10',
        // Attacker attempts to supply fake client price fields (stripped/ignored)
        totalAmount: 1,
        unitPrice: 1,
        items: [{ variantId: testVariantId, quantity: 1 }],
      });

    expect(orderRes.status).toBe(201);
    const created = orderRes.body.data.order;
    // Zafar basePrice = 6850, 10% product discount -> 6165, ROYAL10 (10% of 6165 = 617) -> 5548 + Inside Dhaka 80 = 5628
    expect(created.subtotal).toBe(6165);
    expect(created.discountAmount).toBe(617);
    expect(created.deliveryCharge).toBe(80);
    expect(created.totalAmount).toBe(5628);
  });

  it('prevents overselling under concurrent order requests and restores stock on cancellation', async () => {
    const invBeforeRows = await db
      .select()
      .from(inventory)
      .where(eq(inventory.variantId, lowStockVariantId));
    const stockBefore = invBeforeRows[0].availableStock; // 4 units

    // Exceeding stock directly returns 409
    const excessiveRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Too Many',
        customerPhone: '01711112222',
        deliveryAddress: 'Uttara Sector 7',
        city: 'Dhaka',
        area: 'Uttara',
        paymentMethod: 'cod',
        items: [{ variantId: lowStockVariantId, quantity: stockBefore + 1 }],
      });
    expect(excessiveRes.status).toBe(409);

    // Fire 2 concurrent orders each asking for 3 units when only 4 remain -> only 1 succeeds, 1 fails with 409
    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/orders')
        .send({
          customerName: 'Concurrent Buyer A',
          customerPhone: '01711000001',
          deliveryAddress: 'Gulshan 1',
          city: 'Dhaka',
          area: 'Gulshan',
          paymentMethod: 'cod',
          items: [{ variantId: lowStockVariantId, quantity: 3 }],
        }),
      request(app)
        .post('/api/orders')
        .send({
          customerName: 'Concurrent Buyer B',
          customerPhone: '01711000002',
          deliveryAddress: 'Gulshan 2',
          city: 'Dhaka',
          area: 'Gulshan',
          paymentMethod: 'cod',
          items: [{ variantId: lowStockVariantId, quantity: 3 }],
        }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const successRes = resA.status === 201 ? resA : resB;
    const winningOrderId = successRes.body.data.order.id;

    const invAfterOrder = await db
      .select()
      .from(inventory)
      .where(eq(inventory.variantId, lowStockVariantId));
    expect(invAfterOrder[0].availableStock).toBe(stockBefore - 3);

    // Cancel the order -> stock must be restored atomically
    const cancelRes = await request(app)
      .patch(`/api/admin/orders/${winningOrderId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ orderStatus: 'Cancelled', note: 'Customer requested cancellation' });
    expect(cancelRes.status).toBe(200);

    const invAfterCancel = await db
      .select()
      .from(inventory)
      .where(eq(inventory.variantId, lowStockVariantId));
    expect(invAfterCancel[0].availableStock).toBe(stockBefore);
  });

  it('hides archived products from public catalog endpoints', async () => {
    const archiveRes = await request(app)
      .delete(`/api/products/${archivedProductId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(archiveRes.status).toBe(200);

    const listRes = await request(app).get('/api/products?limit=50');
    expect(listRes.status).toBe(200);
    const found = listRes.body.data.find((p: { id: number }) => p.id === archivedProductId);
    expect(found).toBeUndefined();

    const detailRes = await request(app).get(`/api/products/${archivedProductId}`);
    expect(detailRes.status).toBe(404);
  });
});
