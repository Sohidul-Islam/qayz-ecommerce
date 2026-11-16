import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  analyticsEvents,
  cartItems,
  carts,
  categories,
  customers,
  inventory,
  orderItems,
  orders,
  productImages,
  products,
  productVariants,
  sessions,
} from '../db/schema.js';

export const ALLOWED_ANALYTICS_EVENTS = new Set([
  'Page Viewed',
  'Product Viewed',
  'Product Search',
  'Category Viewed',
  'Cart Created',
  'Add To Cart',
  'Remove From Cart',
  'Quantity Changed',
  'Cart Viewed',
  'Cart Abandoned',
  'Checkout Started',
  'Checkout Completed',
  'Purchase Completed',
  'Buy Now',
  'Wishlist Added',
  'Wishlist Removed',
  'Product Variant Selected',
  'Size Selected',
  'Color Selected',
]);

export function inferTrafficSource(params: {
  utmSource?: string;
  referrer?: string;
}): string {
  const utm = (params.utmSource || '').toLowerCase().trim();
  const ref = (params.referrer || '').toLowerCase().trim();
  const combined = `${utm} ${ref}`;

  if (combined.includes('instagram') || combined.includes('ig_') || utm === 'ig') return 'Instagram';
  if (combined.includes('facebook') || combined.includes('fbclid') || utm === 'fb') return 'Facebook';
  if (combined.includes('tiktok')) return 'TikTok';
  if (combined.includes('google') || combined.includes('gclid')) return 'Google';
  if (ref && !ref.includes('localhost') && !ref.includes('127.0.0.1') && !ref.includes('qayz')) {
    return 'Referral';
  }
  if (utm) return 'Other';
  return 'Direct';
}

export function parseUserAgent(ua: string): { deviceType: string; browser: string; os: string } {
  const lower = ua.toLowerCase();
  const deviceType = /mobile|iphone|android.*mobile/.test(lower)
    ? 'Mobile'
    : /ipad|tablet/.test(lower)
      ? 'Tablet'
      : 'Desktop';

  let browser = 'Other';
  if (lower.includes('edg')) browser = 'Edge';
  else if (lower.includes('chrome')) browser = 'Chrome';
  else if (lower.includes('safari')) browser = 'Safari';
  else if (lower.includes('firefox')) browser = 'Firefox';

  let os = 'Other';
  if (lower.includes('windows')) os = 'Windows';
  else if (lower.includes('mac os') || lower.includes('macintosh')) os = 'macOS';
  else if (lower.includes('android')) os = 'Android';
  else if (lower.includes('iphone') || lower.includes('ipad')) os = 'iOS';
  else if (lower.includes('linux')) os = 'Linux';

  return { deviceType, browser, os };
}

export async function upsertVisitorSession(input: {
  visitorId: string;
  sessionToken: string;
  referrer?: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  userAgent?: string;
}) {
  const existing = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionToken, input.sessionToken))
    .limit(1);

  if (existing[0]) {
    const now = new Date();
    const duration = Math.max(
      existing[0].durationSeconds,
      Math.round((now.getTime() - new Date(existing[0].startedAt).getTime()) / 1000)
    );
    const [updated] = await db
      .update(sessions)
      .set({
        lastSeenAt: now,
        durationSeconds: duration,
        pageViews: sql`${sessions.pageViews} + 1`,
      })
      .where(eq(sessions.id, existing[0].id))
      .returning();
    return updated;
  }

  const prevVisitorSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.visitorId, input.visitorId))
    .limit(1);

  const parsedUa = parseUserAgent(input.userAgent || '');
  const trafficSource = inferTrafficSource({
    utmSource: input.utmSource,
    referrer: input.referrer,
  });

  const [created] = await db
    .insert(sessions)
    .values({
      visitorId: input.visitorId,
      sessionToken: input.sessionToken,
      isReturning: prevVisitorSessions.length > 0,
      trafficSource,
      referrer: (input.referrer || '').slice(0, 500),
      landingPage: (input.landingPage || '/').slice(0, 300),
      utmSource: (input.utmSource || '').slice(0, 100),
      utmMedium: (input.utmMedium || '').slice(0, 100),
      utmCampaign: (input.utmCampaign || '').slice(0, 150),
      utmTerm: (input.utmTerm || '').slice(0, 150),
      utmContent: (input.utmContent || '').slice(0, 150),
      deviceType: parsedUa.deviceType,
      browser: parsedUa.browser,
      os: parsedUa.os,
      country: 'Bangladesh',
      durationSeconds: 0,
      pageViews: 1,
    })
    .returning();

  return created;
}

export async function recordAnalyticsEvent(input: {
  sessionToken?: string;
  visitorId?: string;
  eventType: string;
  productId?: number | null;
  variantId?: number | null;
  categoryId?: number | null;
  orderId?: number | null;
  cartId?: number | null;
  searchQuery?: string | null;
  searchResultsCount?: number | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
  dwellTimeSeconds?: number | null;
  pagePath?: string;
  metadata?: Record<string, unknown>;
  userAgent?: string;
}) {
  let sessionId: number | null = null;
  if (input.sessionToken) {
    const sRows = await db
      .select({ id: sessions.id, startedAt: sessions.startedAt })
      .from(sessions)
      .where(eq(sessions.sessionToken, input.sessionToken))
      .limit(1);
    if (sRows[0]) {
      sessionId = sRows[0].id;
      const now = new Date();
      const duration = Math.max(
        0,
        Math.round((now.getTime() - new Date(sRows[0].startedAt).getTime()) / 1000)
      );
      await db
        .update(sessions)
        .set({ lastSeenAt: now, durationSeconds: duration })
        .where(eq(sessions.id, sessionId));
    } else if (input.visitorId) {
      const createdSess = await upsertVisitorSession({
        visitorId: input.visitorId,
        sessionToken: input.sessionToken,
        landingPage: input.pagePath || '/',
        userAgent: input.userAgent,
      });
      sessionId = createdSess.id;
    }
  }

  const [ev] = await db
    .insert(analyticsEvents)
    .values({
      sessionId,
      sessionToken: input.sessionToken || '',
      visitorId: input.visitorId || '',
      eventType: input.eventType,
      productId: input.productId ?? null,
      variantId: input.variantId ?? null,
      categoryId: input.categoryId ?? null,
      orderId: input.orderId ?? null,
      cartId: input.cartId ?? null,
      searchQuery: input.searchQuery ? input.searchQuery.slice(0, 200) : null,
      searchResultsCount: input.searchResultsCount ?? null,
      selectedSize: input.selectedSize ?? null,
      selectedColor: input.selectedColor ?? null,
      dwellTimeSeconds: input.dwellTimeSeconds ?? null,
      pagePath: (input.pagePath || '/').slice(0, 300),
      metadata: input.metadata || {},
    })
    .returning();

  return ev;
}

export async function getAdminDashboardMetrics() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const allCustomers = await db.select().from(customers);
  const invRows = await db
    .select({
      variantId: productVariants.id,
      sku: productVariants.sku,
      color: productVariants.color,
      size: productVariants.size,
      productId: products.id,
      productName: products.name,
      currentStock: inventory.currentStock,
      availableStock: inventory.availableStock,
      reservedStock: inventory.reservedStock,
      soldQuantity: inventory.soldQuantity,
      lowStockThreshold: inventory.lowStockThreshold,
    })
    .from(inventory)
    .innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(products.isArchived, false));

  const validRevenueOrders = allOrders.filter(
    (o) => !['Cancelled', 'Refunded'].includes(o.orderStatus)
  );

  const totalOrders = allOrders.length;
  const todaysOrders = allOrders.filter((o) => new Date(o.createdAt) >= startOfToday).length;
  const weekOrders = allOrders.filter((o) => new Date(o.createdAt) >= startOfWeek).length;
  const monthOrders = allOrders.filter((o) => new Date(o.createdAt) >= startOfMonth).length;

  const totalRevenue = validRevenueOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const todaysRevenue = validRevenueOrders
    .filter((o) => new Date(o.createdAt) >= startOfToday)
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const avgOrderValue =
    validRevenueOrders.length > 0 ? Math.round(totalRevenue / validRevenueOrders.length) : 0;

  const totalCustomers = allCustomers.length;
  const newCustomers = allCustomers.filter((c) => new Date(c.createdAt) >= startOfMonth).length;

  const pendingOrders = allOrders.filter((o) => o.orderStatus === 'Pending').length;
  const processingOrders = allOrders.filter((o) =>
    ['Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery'].includes(o.orderStatus)
  ).length;
  const deliveredOrders = allOrders.filter((o) => o.orderStatus === 'Delivered').length;
  const cancelledOrders = allOrders.filter((o) => o.orderStatus === 'Cancelled').length;

  const lowStockProducts = invRows.filter(
    (i) => i.availableStock > 0 && i.availableStock <= i.lowStockThreshold
  );
  const outOfStockProducts = invRows.filter((i) => i.availableStock <= 0);

  // Sales & Orders over last 14 days
  const salesSeriesMap = new Map<string, { date: string; revenue: number; orders: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    salesSeriesMap.set(key, { date: key, revenue: 0, orders: 0 });
  }

  for (const o of allOrders) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    const entry = salesSeriesMap.get(key);
    if (entry) {
      entry.orders += 1;
      if (!['Cancelled', 'Refunded'].includes(o.orderStatus)) {
        entry.revenue += o.totalAmount;
      }
    }
  }

  // Best selling products & category performance
  const allOrderItems = await db
    .select({
      productId: orderItems.productId,
      productName: orderItems.productName,
      quantity: orderItems.quantity,
      lineTotal: orderItems.lineTotal,
      orderStatus: orders.orderStatus,
      categoryName: categories.name,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id));

  const productPerfMap = new Map<
    number,
    { productId: number; name: string; unitsSold: number; revenue: number }
  >();
  const categoryPerfMap = new Map<
    string,
    { category: string; unitsSold: number; revenue: number }
  >();

  for (const item of allOrderItems) {
    if (['Cancelled', 'Refunded'].includes(item.orderStatus)) continue;
    const p = productPerfMap.get(item.productId) || {
      productId: item.productId,
      name: item.productName,
      unitsSold: 0,
      revenue: 0,
    };
    p.unitsSold += item.quantity;
    p.revenue += item.lineTotal;
    productPerfMap.set(item.productId, p);

    const c = categoryPerfMap.get(item.categoryName) || {
      category: item.categoryName,
      unitsSold: 0,
      revenue: 0,
    };
    c.unitsSold += item.quantity;
    c.revenue += item.lineTotal;
    categoryPerfMap.set(item.categoryName, c);
  }

  return {
    kpis: {
      totalOrders,
      todaysOrders,
      weekOrders,
      monthOrders,
      totalRevenue,
      todaysRevenue,
      avgOrderValue,
      totalCustomers,
      newCustomers,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      cancelledOrders,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
    },
    charts: {
      salesOverTime: Array.from(salesSeriesMap.values()),
      bestSellingProducts: Array.from(productPerfMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6),
      categoryPerformance: Array.from(categoryPerfMap.values()).sort(
        (a, b) => b.revenue - a.revenue
      ),
    },
    alerts: {
      lowStockItems: lowStockProducts.slice(0, 10),
      outOfStockItems: outOfStockProducts.slice(0, 10),
    },
    recentOrders: allOrders.slice(0, 6),
  };
}

export async function getFullAnalyticsReport(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [allSessions, allEvents, allProducts, allCategories, allOrders, allCustomers, allInv, activeCarts] =
    await Promise.all([
      db.select().from(sessions).where(gte(sessions.startedAt, since)),
      db.select().from(analyticsEvents).where(gte(analyticsEvents.createdAt, since)),
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          basePrice: products.basePrice,
          categoryId: products.categoryId,
          isArchived: products.isArchived,
        })
        .from(products)
        .where(eq(products.isArchived, false)),
      db.select().from(categories),
      db.select().from(orders).where(gte(orders.createdAt, since)),
      db.select().from(customers),
      db
        .select({
          productId: productVariants.productId,
          availableStock: inventory.availableStock,
          soldQuantity: inventory.soldQuantity,
        })
        .from(inventory)
        .innerJoin(productVariants, eq(inventory.variantId, productVariants.id)),
      db
        .select({
          cartId: carts.id,
          sessionToken: carts.sessionToken,
          status: carts.status,
          customerName: carts.customerName,
          customerEmail: carts.customerEmail,
          customerPhone: carts.customerPhone,
          checkoutStarted: carts.checkoutStarted,
          lastActivityAt: carts.lastActivityAt,
          createdAt: carts.createdAt,
        })
        .from(carts)
        .orderBy(desc(carts.lastActivityAt)),
    ]);

  const catMap = new Map(allCategories.map((c) => [c.id, c.name]));

  // Traffic metrics
  const totalSessions = allSessions.length;
  const uniqueVisitorsSet = new Set(allSessions.map((s) => s.visitorId));
  const uniqueVisitors = uniqueVisitorsSet.size;
  const returningVisitors = allSessions.filter((s) => s.isReturning).length;
  const newVisitors = Math.max(0, totalSessions - returningVisitors);
  const avgSessionDuration =
    totalSessions > 0
      ? Math.round(allSessions.reduce((acc, s) => acc + s.durationSeconds, 0) / totalSessions)
      : 0;
  const totalPageViews = allEvents.filter((e) => e.eventType === 'Page Viewed').length;

  // Device, Browser, OS, Country, Landing Page, and Referrer breakdowns
  const deviceMap = new Map<string, number>();
  const browserMap = new Map<string, number>();
  const osMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const landingPageMap = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  for (const s of allSessions) {
    deviceMap.set(s.deviceType, (deviceMap.get(s.deviceType) || 0) + 1);
    browserMap.set(s.browser, (browserMap.get(s.browser) || 0) + 1);
    osMap.set(s.os, (osMap.get(s.os) || 0) + 1);
    countryMap.set(s.country, (countryMap.get(s.country) || 0) + 1);
    const lp = s.landingPage.split('?')[0] || '/';
    landingPageMap.set(lp, (landingPageMap.get(lp) || 0) + 1);
    const refLabel = s.referrer || 'Direct (No Referrer)';
    referrerMap.set(refLabel, (referrerMap.get(refLabel) || 0) + 1);
  }

  // Funnel calculation
  const visitorsCount = totalSessions;
  const productViewEvents = allEvents.filter((e) => e.eventType === 'Product Viewed');
  const addToCartEvents = allEvents.filter((e) => e.eventType === 'Add To Cart');
  const checkoutStartedEvents = allEvents.filter((e) => e.eventType === 'Checkout Started');
  const purchaseEvents = allEvents.filter((e) => e.eventType === 'Purchase Completed');

  const distinctProductViewSessions = new Set(
    productViewEvents.map((e) => e.sessionToken || String(e.id))
  ).size;
  const distinctCartSessions = new Set(
    addToCartEvents.map((e) => e.sessionToken || String(e.id))
  ).size;
  const distinctCheckoutSessions = new Set(
    checkoutStartedEvents.map((e) => e.sessionToken || String(e.id))
  ).size;
  const completedOrdersCount = allOrders.filter(
    (o) => !['Cancelled', 'Refunded'].includes(o.orderStatus)
  ).length;

  const funnel = [
    {
      step: 'Visitors',
      count: visitorsCount,
      rateFromPrevious: 100,
      overallRate: 100,
    },
    {
      step: 'Product Views',
      count: distinctProductViewSessions,
      rateFromPrevious:
        visitorsCount > 0 ? Number(((distinctProductViewSessions / visitorsCount) * 100).toFixed(1)) : 0,
      overallRate:
        visitorsCount > 0 ? Number(((distinctProductViewSessions / visitorsCount) * 100).toFixed(1)) : 0,
    },
    {
      step: 'Add To Cart',
      count: distinctCartSessions,
      rateFromPrevious:
        distinctProductViewSessions > 0
          ? Number(((distinctCartSessions / distinctProductViewSessions) * 100).toFixed(1))
          : 0,
      overallRate:
        visitorsCount > 0 ? Number(((distinctCartSessions / visitorsCount) * 100).toFixed(1)) : 0,
    },
    {
      step: 'Checkout Started',
      count: distinctCheckoutSessions,
      rateFromPrevious:
        distinctCartSessions > 0
          ? Number(((distinctCheckoutSessions / distinctCartSessions) * 100).toFixed(1))
          : 0,
      overallRate:
        visitorsCount > 0 ? Number(((distinctCheckoutSessions / visitorsCount) * 100).toFixed(1)) : 0,
    },
    {
      step: 'Order Completed',
      count: completedOrdersCount,
      rateFromPrevious:
        distinctCheckoutSessions > 0
          ? Number(((completedOrdersCount / distinctCheckoutSessions) * 100).toFixed(1))
          : 0,
      overallRate:
        visitorsCount > 0 ? Number(((completedOrdersCount / visitorsCount) * 100).toFixed(1)) : 0,
    },
  ];

  // Traffic Source & Campaign Attribution
  const sessionById = new Map(allSessions.map((s) => [s.id, s]));
  const sessionByToken = new Map(allSessions.map((s) => [s.sessionToken, s]));

  interface SourceStat {
    source: string;
    visitors: number;
    productViews: number;
    addToCarts: number;
    checkouts: number;
    orders: number;
    revenue: number;
    conversionRate: number;
  }

  const sourceMap = new Map<string, SourceStat>();
  const ensureSource = (src: string): SourceStat => {
    const existing = sourceMap.get(src);
    if (existing) return existing;
    const init: SourceStat = {
      source: src,
      visitors: 0,
      productViews: 0,
      addToCarts: 0,
      checkouts: 0,
      orders: 0,
      revenue: 0,
      conversionRate: 0,
    };
    sourceMap.set(src, init);
    return init;
  };

  for (const s of allSessions) {
    ensureSource(s.trafficSource).visitors += 1;
  }

  for (const ev of allEvents) {
    const sess =
      (ev.sessionId ? sessionById.get(ev.sessionId) : undefined) ||
      (ev.sessionToken ? sessionByToken.get(ev.sessionToken) : undefined);
    const src = sess?.trafficSource || 'Direct';
    const stat = ensureSource(src);
    if (ev.eventType === 'Product Viewed') stat.productViews += 1;
    if (ev.eventType === 'Add To Cart') stat.addToCarts += 1;
    if (ev.eventType === 'Checkout Started') stat.checkouts += 1;
  }

  for (const o of allOrders) {
    if (['Cancelled', 'Refunded'].includes(o.orderStatus)) continue;
    const stat = ensureSource(o.trafficSource || 'Direct');
    stat.orders += 1;
    stat.revenue += o.totalAmount;
  }

  const trafficSources = Array.from(sourceMap.values())
    .map((st) => ({
      ...st,
      conversionRate: st.visitors > 0 ? Number(((st.orders / st.visitors) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors);

  // UTM Campaign breakdown
  const campaignMap = new Map<
    string,
    { campaign: string; source: string; medium: string; visitors: number }
  >();
  for (const s of allSessions) {
    if (!s.utmCampaign) continue;
    const key = `${s.utmCampaign}::${s.utmSource}`;
    const existing = campaignMap.get(key) || {
      campaign: s.utmCampaign,
      source: s.utmSource || s.trafficSource,
      medium: s.utmMedium || 'social',
      visitors: 0,
    };
    existing.visitors += 1;
    campaignMap.set(key, existing);
  }

  // Product Performance & Restock Intelligence
  const stockByProduct = new Map<number, { availableStock: number; soldQuantity: number }>();
  for (const iv of allInv) {
    const cur = stockByProduct.get(iv.productId) || { availableStock: 0, soldQuantity: 0 };
    cur.availableStock += iv.availableStock;
    cur.soldQuantity += iv.soldQuantity;
    stockByProduct.set(iv.productId, cur);
  }

  const imgRows = await db.select().from(productImages).orderBy(productImages.displayOrder);
  const imgByProduct = new Map<number, string>();
  for (const img of imgRows) {
    if (!imgByProduct.has(img.productId) || img.isPrimary) {
      imgByProduct.set(img.productId, img.url);
    }
  }

  const orderItemsRows = await db
    .select({
      productId: orderItems.productId,
      quantity: orderItems.quantity,
      lineTotal: orderItems.lineTotal,
      orderStatus: orders.orderStatus,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(gte(orders.createdAt, since));

  const salesByProduct = new Map<number, { units: number; revenue: number }>();
  for (const oi of orderItemsRows) {
    if (['Cancelled', 'Refunded'].includes(oi.orderStatus)) continue;
    const cur = salesByProduct.get(oi.productId) || { units: 0, revenue: 0 };
    cur.units += oi.quantity;
    cur.revenue += oi.lineTotal;
    salesByProduct.set(oi.productId, cur);
  }

  const productMetrics = allProducts.map((p) => {
    const pViews = productViewEvents.filter((e) => e.productId === p.id);
    const views = pViews.length;
    const addToCarts = addToCartEvents.filter((e) => e.productId === p.id).length;
    const removals = allEvents.filter(
      (e) => e.eventType === 'Remove From Cart' && e.productId === p.id
    ).length;
    const wishlistAdds = allEvents.filter(
      (e) => e.eventType === 'Wishlist Added' && e.productId === p.id
    ).length;
    const dwellSamples = pViews.filter((e) => (e.dwellTimeSeconds ?? 0) > 0);
    const avgDwellSeconds =
      dwellSamples.length > 0
        ? Math.round(
            dwellSamples.reduce((a, b) => a + (b.dwellTimeSeconds ?? 0), 0) / dwellSamples.length
          )
        : 0;

    const sales = salesByProduct.get(p.id) || { units: 0, revenue: 0 };
    const stock = stockByProduct.get(p.id) || { availableStock: 0, soldQuantity: 0 };

    const addToCartRate = views > 0 ? Number(((addToCarts / views) * 100).toFixed(1)) : 0;
    const conversionRate = views > 0 ? Number(((sales.units / views) * 100).toFixed(1)) : 0;
    const salesVelocityPerDay = Number((sales.units / Math.max(1, days)).toFixed(2));
    const daysOfStockLeft =
      salesVelocityPerDay > 0 ? Math.round(stock.availableStock / salesVelocityPerDay) : 999;

    const restockPriorityScore = Math.round(
      (salesVelocityPerDay * 40 + addToCartRate * 1.5 + views * 0.2) /
        Math.max(1, stock.availableStock * 0.4)
    );

    return {
      productId: p.id,
      name: p.name,
      slug: p.slug,
      category: catMap.get(p.categoryId) || 'Punjabi',
      imageUrl: imgByProduct.get(p.id) || null,
      views,
      avgDwellSeconds,
      addToCarts,
      removals,
      wishlistAdds,
      purchases: sales.units,
      revenue: sales.revenue,
      addToCartRate,
      conversionRate,
      availableStock: stock.availableStock,
      salesVelocityPerDay,
      daysOfStockLeft,
      restockPriorityScore,
    };
  });

  // High views but low conversion leaks
  const highViewsLowPurchases = productMetrics
    .filter((pm) => pm.views >= 10 && pm.conversionRate < 5)
    .sort((a, b) => b.views - a.views);

  // Restock recommendations
  const restockRecommendations = productMetrics
    .filter((pm) => pm.availableStock <= 25 && (pm.salesVelocityPerDay > 0 || pm.addToCarts > 3))
    .sort((a, b) => b.restockPriorityScore - a.restockPriorityScore)
    .slice(0, 8);

  // Search analytics
  const searchEvents = allEvents.filter((e) => e.eventType === 'Product Search' && e.searchQuery);
  const searchMap = new Map<
    string,
    { query: string; count: number; zeroResultsCount: number; lastSearchedAt: Date }
  >();
  for (const se of searchEvents) {
    const q = (se.searchQuery || '').toLowerCase().trim();
    if (!q) continue;
    const cur = searchMap.get(q) || {
      query: q,
      count: 0,
      zeroResultsCount: 0,
      lastSearchedAt: se.createdAt,
    };
    cur.count += 1;
    if ((se.searchResultsCount ?? 1) === 0) {
      cur.zeroResultsCount += 1;
    }
    if (se.createdAt > cur.lastSearchedAt) cur.lastSearchedAt = se.createdAt;
    searchMap.set(q, cur);
  }
  const searchInsights = Array.from(searchMap.values()).sort((a, b) => b.count - a.count);
  const zeroResultSearches = searchInsights.filter((s) => s.zeroResultsCount > 0);

  // Abandoned Carts detail
  const abandonedCartRows = activeCarts.filter((c) => c.status !== 'converted');
  const abandonedCartIds = abandonedCartRows.map((c) => c.cartId);
  const cartItemsDetailed =
    abandonedCartIds.length > 0
      ? await db
          .select({
            cartId: cartItems.cartId,
            productId: cartItems.productId,
            quantity: cartItems.quantity,
            productName: products.name,
            basePrice: products.basePrice,
            color: productVariants.color,
            size: productVariants.size,
          })
          .from(cartItems)
          .innerJoin(products, eq(cartItems.productId, products.id))
          .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
      : [];

  const abandonedCountByProduct = new Map<number, number>();
  for (const ci of cartItemsDetailed) {
    if (abandonedCartIds.includes(ci.cartId)) {
      abandonedCountByProduct.set(
        ci.productId,
        (abandonedCountByProduct.get(ci.productId) || 0) + ci.quantity
      );
    }
  }

  const abandonedCarts = abandonedCartRows
    .map((c) => {
      const items = cartItemsDetailed.filter((ci) => ci.cartId === c.cartId);
      const value = items.reduce((acc, it) => acc + it.basePrice * it.quantity, 0);
      return {
        ...c,
        itemsCount: items.reduce((a, b) => a + b.quantity, 0),
        cartValue: value,
        items,
      };
    })
    .filter((c) => c.itemsCount > 0);

  // Popular Categories, Highest/Lowest Conversion & Most Abandoned Products
  const productMetricsWithAbandon = productMetrics.map((pm) => ({
    ...pm,
    abandonedCount: abandonedCountByProduct.get(pm.productId) || 0,
  }));

  const categoryAggMap = new Map<
    string,
    { category: string; views: number; addToCarts: number; purchases: number; revenue: number }
  >();
  for (const pm of productMetricsWithAbandon) {
    const cur = categoryAggMap.get(pm.category) || {
      category: pm.category,
      views: 0,
      addToCarts: 0,
      purchases: 0,
      revenue: 0,
    };
    cur.views += pm.views;
    cur.addToCarts += pm.addToCarts;
    cur.purchases += pm.purchases;
    cur.revenue += pm.revenue;
    categoryAggMap.set(pm.category, cur);
  }
  const popularCategories = Array.from(categoryAggMap.values()).sort(
    (a, b) => b.views - a.views || b.revenue - a.revenue
  );

  // Search-to-click & Search-to-order attribution
  const searchSessionTokens = new Set(
    searchEvents.map((e) => e.sessionToken).filter((t) => Boolean(t))
  );
  const productsClickedAfterSearch = productViewEvents.filter(
    (e) => e.sessionToken && searchSessionTokens.has(e.sessionToken)
  ).length;
  const ordersFromSearch = allOrders.filter(
    (o) => o.sourceSessionId && searchSessionTokens.has(o.sourceSessionId)
  ).length;

  // Sales & Customer summary
  const validOrders = allOrders.filter((o) => !['Cancelled', 'Refunded'].includes(o.orderStatus));
  const totalRevenue = validOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const cancelledCount = allOrders.filter((o) => o.orderStatus === 'Cancelled').length;
  const returnedCount = allOrders.filter((o) => o.orderStatus === 'Returned').length;
  const repeatCustomers = allCustomers.filter((c) => c.totalOrders > 1).length;
  const newCustomersCount = allCustomers.filter((c) => c.totalOrders <= 1).length;

  const acqSourceMap = new Map<string, number>();
  for (const c of allCustomers) {
    acqSourceMap.set(c.firstSource, (acqSourceMap.get(c.firstSource) || 0) + 1);
  }

  const toBreakdown = (m: Map<string, number>) =>
    Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

  return {
    periodDays: days,
    traffic: {
      totalVisitors: totalSessions,
      uniqueVisitors,
      newVisitors,
      returningVisitors,
      totalPageViews,
      avgSessionDurationSeconds: avgSessionDuration,
      devices: Array.from(deviceMap.entries()).map(([device, count]) => ({ device, count })),
      browsers: toBreakdown(browserMap),
      operatingSystems: toBreakdown(osMap),
      countries: toBreakdown(countryMap),
      landingPages: toBreakdown(landingPageMap).slice(0, 8),
      referrers: toBreakdown(referrerMap).slice(0, 8),
      trafficSources,
      campaigns: Array.from(campaignMap.values()).sort((a, b) => b.visitors - a.visitors),
    },
    sales: {
      revenue: totalRevenue,
      orders: allOrders.length,
      completedOrders: validOrders.length,
      avgOrderValue: validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0,
      conversionRate:
        totalSessions > 0 ? Number(((validOrders.length / totalSessions) * 100).toFixed(2)) : 0,
      cancellationRate:
        allOrders.length > 0 ? Number(((cancelledCount / allOrders.length) * 100).toFixed(1)) : 0,
      returnRate:
        allOrders.length > 0 ? Number(((returnedCount / allOrders.length) * 100).toFixed(1)) : 0,
    },
    customers: {
      totalCustomers: allCustomers.length,
      newCustomers: newCustomersCount,
      returningCustomers: repeatCustomers,
      repeatCustomers,
      repeatPurchaseRate:
        allCustomers.length > 0
          ? Number(((repeatCustomers / allCustomers.length) * 100).toFixed(1))
          : 0,
      acquisitionSources: toBreakdown(acqSourceMap),
    },
    funnel,
    products: {
      all: productMetricsWithAbandon.sort((a, b) => b.views - a.views),
      mostViewed: [...productMetricsWithAbandon].sort((a, b) => b.views - a.views).slice(0, 5),
      mostAddedToCart: [...productMetricsWithAbandon]
        .sort((a, b) => b.addToCarts - a.addToCarts)
        .slice(0, 5),
      mostPurchased: [...productMetricsWithAbandon]
        .sort((a, b) => b.purchases - a.purchases)
        .slice(0, 5),
      mostAbandonedProducts: [...productMetricsWithAbandon]
        .filter((p) => p.abandonedCount > 0 || p.removals > 0)
        .sort((a, b) => b.abandonedCount + b.removals - (a.abandonedCount + a.removals))
        .slice(0, 5),
      highestConversionProducts: [...productMetricsWithAbandon]
        .filter((p) => p.views > 0)
        .sort((a, b) => b.conversionRate - a.conversionRate)
        .slice(0, 5),
      lowestConversionProducts: [...productMetricsWithAbandon]
        .filter((p) => p.views > 0)
        .sort((a, b) => a.conversionRate - b.conversionRate)
        .slice(0, 5),
      popularCategories,
      highViewsLowPurchases,
      restockRecommendations,
    },
    search: {
      topKeywords: searchInsights.slice(0, 15),
      zeroResultSearches,
      productsClickedAfterSearch,
      ordersFromSearch,
    },
    abandonedCarts,
  };
}
