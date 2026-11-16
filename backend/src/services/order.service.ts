import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  addresses,
  analyticsEvents,
  cartItems,
  carts,
  coupons,
  customers,
  deliveries,
  deliveryZones,
  orderItems,
  orders,
  orderStatusHistory,
  payments,
  productImages,
  products,
  productVariants,
  sessions,
} from '../db/schema.js';
import { AppError } from '../middleware/error.js';
import {
  calculateDiscountedUnitPrice,
  deductStockForOrderTx,
  restoreStockForOrderTx,
} from './inventory.service.js';
import { dispatchNotification } from './notification.service.js';

export const VALID_ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Returned',
  'Refunded',
] as const;

export type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

export const VALID_DELIVERY_STATUSES = [
  'Pending',
  'Assigned',
  'Picked Up',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Failed',
  'Returned',
] as const;

export type DeliveryStatus = (typeof VALID_DELIVERY_STATUSES)[number];

export const VALID_PAYMENT_METHODS = ['cod', 'online', 'bkash', 'card'] as const;
export type PaymentMethod = (typeof VALID_PAYMENT_METHODS)[number];

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  city: string;
  area: string;
  postalCode?: string;
  deliveryInstructions?: string;
  deliveryZoneId?: number;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  cartSessionToken?: string;
  analyticsSessionToken?: string;
  visitorId?: string;
  items: Array<{ variantId: number; quantity: number }>;
}

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const rand2 = Math.floor(10 + Math.random() * 90);
  return `QYZ-${y}${m}${d}-${rand}${rand2}`;
}

export function validateCouponAmount(
  coupon: typeof coupons.$inferSelect,
  subtotal: number
): number {
  if (!coupon.isActive) {
    throw new AppError(400, 'This coupon is no longer active', 'COUPON_INACTIVE');
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw new AppError(400, 'This coupon has expired', 'COUPON_EXPIRED');
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError(400, 'This coupon has reached its usage limit', 'COUPON_LIMIT_REACHED');
  }
  if (subtotal < coupon.minOrderAmount) {
    throw new AppError(
      400,
      `Minimum order amount of BDT ${coupon.minOrderAmount} required for coupon ${coupon.code}`,
      'COUPON_MIN_AMOUNT'
    );
  }

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = Math.round((subtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  } else {
    discount = coupon.discountValue;
  }

  return Math.min(subtotal, Math.max(0, discount));
}

export async function createOrder(input: CreateOrderInput) {
  const normalizedPhone = input.customerPhone.replace(/\s+/g, '').trim();

  const createdOrder = await db.transaction(async (tx) => {
    let requestedItems = input.items;

    // Fallback to active cart items if items array is empty and cartSessionToken provided
    let activeCart: typeof carts.$inferSelect | undefined;
    if (input.cartSessionToken) {
      const cartRows = await tx
        .select()
        .from(carts)
        .where(eq(carts.sessionToken, input.cartSessionToken))
        .limit(1);
      activeCart = cartRows[0];

      if ((!requestedItems || requestedItems.length === 0) && activeCart) {
        const cItems = await tx
          .select()
          .from(cartItems)
          .where(eq(cartItems.cartId, activeCart.id));
        requestedItems = cItems.map((ci) => ({
          variantId: ci.variantId,
          quantity: ci.quantity,
        }));
      }
    }

    if (!requestedItems || requestedItems.length === 0) {
      throw new AppError(400, 'Cannot create an order with an empty cart', 'EMPTY_ORDER');
    }

    // Consolidate duplicate variantIds
    const qtyByVariant = new Map<number, number>();
    for (const item of requestedItems) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new AppError(400, 'Item quantity must be at least 1', 'INVALID_QUANTITY');
      }
      qtyByVariant.set(item.variantId, (qtyByVariant.get(item.variantId) || 0) + item.quantity);
    }

    const variantIds = Array.from(qtyByVariant.keys());

    // Fetch authoritative product & variant records from DB
    const variantRows = await tx
      .select({
        variantId: productVariants.id,
        sku: productVariants.sku,
        color: productVariants.color,
        size: productVariants.size,
        priceOverride: productVariants.priceOverride,
        variantActive: productVariants.isActive,
        productId: products.id,
        productName: products.name,
        categoryId: products.categoryId,
        basePrice: products.basePrice,
        discountType: products.discountType,
        discountValue: products.discountValue,
        productActive: products.isActive,
        productArchived: products.isArchived,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(inArray(productVariants.id, variantIds));

    if (variantRows.length !== variantIds.length) {
      throw new AppError(404, 'One or more selected product variants do not exist', 'VARIANT_NOT_FOUND');
    }

    const orderNumber = generateOrderNumber();
    let subtotal = 0;

    const preparedOrderItems: Array<{
      productId: number;
      variantId: number;
      categoryId: number;
      productName: string;
      variantSku: string;
      variantColor: string;
      variantSize: string;
      unitPrice: number;
      discountPerUnit: number;
      finalUnitPrice: number;
      quantity: number;
      lineTotal: number;
    }> = [];

    // Deduct stock atomically and compute server-authoritative pricing
    for (const v of variantRows) {
      if (!v.productActive || v.productArchived || !v.variantActive) {
        throw new AppError(
          400,
          `${v.productName} (${v.color} / ${v.size}) is currently unavailable`,
          'PRODUCT_UNAVAILABLE'
        );
      }

      const qty = qtyByVariant.get(v.variantId)!;

      // Atomic stock check & deduction
      await deductStockForOrderTx(tx, {
        variantId: v.variantId,
        quantity: qty,
        orderNumber,
      });

      const pricing = calculateDiscountedUnitPrice(
        v.basePrice,
        v.discountType,
        v.discountValue,
        v.priceOverride
      );

      const lineTotal = pricing.finalUnitPrice * qty;
      subtotal += lineTotal;

      preparedOrderItems.push({
        productId: v.productId,
        variantId: v.variantId,
        categoryId: v.categoryId,
        productName: v.productName,
        variantSku: v.sku,
        variantColor: v.color,
        variantSize: v.size,
        unitPrice: pricing.unitPrice,
        discountPerUnit: pricing.discountPerUnit,
        finalUnitPrice: pricing.finalUnitPrice,
        quantity: qty,
        lineTotal,
      });
    }

    // Server-side coupon validation & calculation
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;
    const rawCoupon = input.couponCode?.trim().toUpperCase();
    if (rawCoupon) {
      const couponRows = await tx
        .select()
        .from(coupons)
        .where(eq(coupons.code, rawCoupon))
        .limit(1);
      const coupon = couponRows[0];
      if (!coupon) {
        throw new AppError(400, `Invalid coupon code: ${rawCoupon}`, 'INVALID_COUPON');
      }
      discountAmount = validateCouponAmount(coupon, subtotal);
      appliedCouponCode = coupon.code;
      await tx
        .update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(eq(coupons.id, coupon.id));
    }

    // Server-side delivery zone charge calculation
    let selectedZone: typeof deliveryZones.$inferSelect | undefined;
    if (input.deliveryZoneId) {
      const zRows = await tx
        .select()
        .from(deliveryZones)
        .where(and(eq(deliveryZones.id, input.deliveryZoneId), eq(deliveryZones.isActive, true)))
        .limit(1);
      selectedZone = zRows[0];
    }
    if (!selectedZone) {
      const fallbackZones = await tx
        .select()
        .from(deliveryZones)
        .where(eq(deliveryZones.isActive, true))
        .limit(1);
      selectedZone = fallbackZones[0];
    }

    const netAfterDiscount = Math.max(0, subtotal - discountAmount);
    let deliveryCharge = selectedZone ? selectedZone.charge : 100;
    if (
      selectedZone?.freeShippingThreshold &&
      netAfterDiscount >= selectedZone.freeShippingThreshold
    ) {
      deliveryCharge = 0;
    }

    const totalAmount = netAfterDiscount + deliveryCharge;

    // Resolve attribution traffic source from analytics session
    let trafficSource = 'Direct';
    let sessionDbId: number | null = null;
    if (input.analyticsSessionToken) {
      const sessRows = await tx
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, input.analyticsSessionToken))
        .limit(1);
      if (sessRows[0]) {
        trafficSource = sessRows[0].trafficSource;
        sessionDbId = sessRows[0].id;
      }
    }

    // Upsert customer
    const existingCustomers = await tx
      .select()
      .from(customers)
      .where(eq(customers.phone, normalizedPhone))
      .limit(1);

    let customerId: number;
    if (existingCustomers[0]) {
      customerId = existingCustomers[0].id;
      await tx
        .update(customers)
        .set({
          name: input.customerName,
          email: input.customerEmail || existingCustomers[0].email,
          totalOrders: sql`${customers.totalOrders} + 1`,
          totalSpent: sql`${customers.totalSpent} + ${totalAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customerId));
    } else {
      const [insertedCustomer] = await tx
        .insert(customers)
        .values({
          name: input.customerName,
          phone: normalizedPhone,
          email: input.customerEmail || null,
          totalOrders: 1,
          totalSpent: totalAmount,
          firstSource: trafficSource,
        })
        .returning();
      customerId = insertedCustomer.id;
    }

    await tx.insert(addresses).values({
      customerId,
      label: 'Delivery',
      recipientName: input.customerName,
      phone: normalizedPhone,
      addressLine: input.deliveryAddress,
      area: input.area,
      city: input.city,
      postalCode: input.postalCode || '',
      isDefault: true,
    });

    // Insert Order
    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber,
        customerId,
        customerName: input.customerName,
        customerPhone: normalizedPhone,
        customerEmail: input.customerEmail || null,
        deliveryAddress: input.deliveryAddress,
        city: input.city,
        area: input.area,
        postalCode: input.postalCode || '',
        deliveryInstructions: input.deliveryInstructions || '',
        deliveryZoneId: selectedZone?.id ?? null,
        subtotal,
        discountAmount,
        couponCode: appliedCouponCode,
        deliveryCharge,
        totalAmount,
        paymentMethod: input.paymentMethod,
        paymentStatus: 'pending',
        orderStatus: 'Pending',
        deliveryStatus: 'Pending',
        sourceSessionId: input.analyticsSessionToken || null,
        trafficSource,
      })
      .returning();

    // Insert Order Items
    for (const item of preparedOrderItems) {
      await tx.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantSku: item.variantSku,
        variantColor: item.variantColor,
        variantSize: item.variantSize,
        unitPrice: item.unitPrice,
        discountPerUnit: item.discountPerUnit,
        finalUnitPrice: item.finalUnitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      });
    }

    // Record immutable Order Status History
    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      previousStatus: null,
      newStatus: 'Pending',
      statusType: 'order',
      note: 'Order placed by customer',
      changedByName: input.customerName,
    });

    // Payment record (extensible provider abstraction)
    const providerMap: Record<PaymentMethod, string> = {
      cod: 'cod',
      online: 'sslcommerz_gateway',
      bkash: 'bkash_checkout',
      card: 'card_gateway',
    };
    await tx.insert(payments).values({
      orderId: order.id,
      provider: providerMap[input.paymentMethod],
      method: input.paymentMethod,
      amount: totalAmount,
      currency: 'BDT',
      status: 'pending',
      transactionRef: `PAY-${orderNumber}`,
      metadata: {
        gatewayReady: input.paymentMethod !== 'cod',
        note:
          input.paymentMethod === 'cod'
            ? 'Pay on delivery'
            : 'Payment intent initialized; ready for gateway redirect',
      },
    });

    // Delivery record
    const estDays = selectedZone?.estimatedDays || '2-3 Business Days';
    await tx.insert(deliveries).values({
      orderId: order.id,
      deliveryZoneId: selectedZone?.id ?? null,
      courierPartner: selectedZone?.slug === 'inside-dhaka' ? 'QAYZ Express Dhaka' : 'Steadfast / Pathao Courier',
      trackingNumber: `TRK-${orderNumber.replace('QYZ-', '')}`,
      deliveryCharge,
      deliveryStatus: 'Pending',
      estimatedDeliveryDate: estDays,
      deliveryNotes: input.deliveryInstructions || '',
    });

    // Mark active cart as converted and clear items
    if (activeCart) {
      await tx
        .update(carts)
        .set({
          status: 'converted',
          customerId,
          customerName: input.customerName,
          customerPhone: normalizedPhone,
          customerEmail: input.customerEmail || null,
          checkoutStarted: true,
          updatedAt: new Date(),
        })
        .where(eq(carts.id, activeCart.id));
      await tx.delete(cartItems).where(eq(cartItems.cartId, activeCart.id));
    }

    // Track Purchase Completed & Checkout Completed events
    for (const item of preparedOrderItems) {
      await tx.insert(analyticsEvents).values({
        sessionId: sessionDbId,
        sessionToken: input.analyticsSessionToken || '',
        visitorId: input.visitorId || '',
        eventType: 'Purchase Completed',
        productId: item.productId,
        variantId: item.variantId,
        categoryId: item.categoryId,
        orderId: order.id,
        selectedSize: item.variantSize,
        selectedColor: item.variantColor,
        pagePath: '/checkout',
        metadata: {
          orderNumber,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        },
      });
    }

    return {
      order,
      items: preparedOrderItems,
      estimatedDelivery: estDays,
    };
  });

  // Fire pluggable notifications (non-blocking)
  await dispatchNotification({
    channel: 'sms',
    event: 'order_placed',
    recipient: createdOrder.order.customerPhone,
    subject: `QAYZ Order Confirmed: ${createdOrder.order.orderNumber}`,
    payload: {
      orderNumber: createdOrder.order.orderNumber,
      totalAmount: createdOrder.order.totalAmount,
      paymentMethod: createdOrder.order.paymentMethod,
    },
  });

  if (createdOrder.order.customerEmail) {
    await dispatchNotification({
      channel: 'email',
      event: 'order_placed',
      recipient: createdOrder.order.customerEmail,
      subject: `Thank you for your QAYZ order (${createdOrder.order.orderNumber})`,
      payload: {
        orderNumber: createdOrder.order.orderNumber,
        totalAmount: createdOrder.order.totalAmount,
      },
    });
  }

  return createdOrder;
}

export async function getOrderDetailsByNumber(
  orderNumber: string,
  phone?: string,
  isAdmin = false
) {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber.trim().toUpperCase()))
    .limit(1);

  const order = rows[0];
  if (!order) {
    throw new AppError(404, `Order ${orderNumber} not found`, 'ORDER_NOT_FOUND');
  }

  // Enforce customer ownership verification on public order endpoints (Rule 10)
  if (!isAdmin) {
    if (!phone || !phone.trim()) {
      throw new AppError(
        403,
        'Phone verification is required to view this order',
        'ORDER_ACCESS_DENIED'
      );
    }
    const cleanInput = phone.replace(/\D/g, '').slice(-8);
    const cleanOrderPhone = order.customerPhone.replace(/\D/g, '').slice(-8);
    if (!cleanInput || cleanInput !== cleanOrderPhone) {
      throw new AppError(403, 'Phone number does not match this order', 'ORDER_ACCESS_DENIED');
    }
  }

  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      variantId: orderItems.variantId,
      productName: orderItems.productName,
      variantSku: orderItems.variantSku,
      variantColor: orderItems.variantColor,
      variantSize: orderItems.variantSize,
      unitPrice: orderItems.unitPrice,
      discountPerUnit: orderItems.discountPerUnit,
      finalUnitPrice: orderItems.finalUnitPrice,
      quantity: orderItems.quantity,
      lineTotal: orderItems.lineTotal,
      productSlug: products.slug,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, order.id));

  // Fetch primary image per product
  const productIds = items.map((i) => i.productId);
  const imgMap = new Map<number, string>();
  if (productIds.length > 0) {
    const imgs = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(productImages.displayOrder);
    for (const img of imgs) {
      if (!imgMap.has(img.productId) || img.isPrimary) {
        imgMap.set(img.productId, img.url);
      }
    }
  }

  const history = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, order.id))
    .orderBy(desc(orderStatusHistory.createdAt));

  const deliveryRows = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.orderId, order.id))
    .limit(1);

  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, order.id))
    .limit(1);

  return {
    ...order,
    items: items.map((i) => ({ ...i, imageUrl: imgMap.get(i.productId) || null })),
    history,
    delivery: deliveryRows[0] || null,
    payment: paymentRows[0] || null,
  };
}

const RESTORED_TERMINAL_STATUSES = new Set(['Cancelled', 'Returned', 'Refunded']);

export async function updateOrderStatusByAdmin(params: {
  orderId: number;
  newStatus: OrderStatus;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  note?: string;
  adminId: number;
  adminName: string;
}) {
  const result = await db.transaction(async (tx) => {
    const orderRows = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, params.orderId))
      .limit(1);

    const order = orderRows[0];
    if (!order) {
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
    }

    const previousStatus = order.orderStatus;
    const wasAlreadyRestored = RESTORED_TERMINAL_STATUSES.has(previousStatus);
    const shouldRestoreStock =
      !wasAlreadyRestored &&
      (params.newStatus === 'Cancelled' || params.newStatus === 'Returned');

    if (shouldRestoreStock) {
      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      for (const item of items) {
        await restoreStockForOrderTx(tx, {
          variantId: item.variantId,
          quantity: item.quantity,
          orderNumber: order.orderNumber,
          reason: params.newStatus === 'Cancelled' ? 'Order Cancellation' : 'Return',
          adminId: params.adminId,
        });
      }
    }

    let nextDeliveryStatus = order.deliveryStatus;
    if (params.newStatus === 'Shipped') nextDeliveryStatus = 'In Transit';
    if (params.newStatus === 'Out for Delivery') nextDeliveryStatus = 'Out for Delivery';
    if (params.newStatus === 'Delivered') nextDeliveryStatus = 'Delivered';
    if (params.newStatus === 'Returned') nextDeliveryStatus = 'Returned';
    if (params.newStatus === 'Cancelled' && order.deliveryStatus === 'Pending') {
      nextDeliveryStatus = 'Failed';
    }

    const nextPaymentStatus =
      params.paymentStatus ||
      (params.newStatus === 'Delivered' && order.paymentStatus === 'pending'
        ? 'paid'
        : params.newStatus === 'Refunded'
          ? 'refunded'
          : order.paymentStatus);

    const [updatedOrder] = await tx
      .update(orders)
      .set({
        orderStatus: params.newStatus,
        deliveryStatus: nextDeliveryStatus,
        paymentStatus: nextPaymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id))
      .returning();

    if (previousStatus !== params.newStatus) {
      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        previousStatus,
        newStatus: params.newStatus,
        statusType: 'order',
        note: params.note || `Order marked as ${params.newStatus}`,
        changedByAdminId: params.adminId,
        changedByName: params.adminName,
      });
    }

    if (nextPaymentStatus !== order.paymentStatus) {
      await tx
        .update(payments)
        .set({
          status: nextPaymentStatus,
          paidAt: nextPaymentStatus === 'paid' ? new Date() : null,
        })
        .where(eq(payments.orderId, order.id));

      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        previousStatus: order.paymentStatus,
        newStatus: nextPaymentStatus,
        statusType: 'payment',
        note: `Payment status updated to ${nextPaymentStatus}`,
        changedByAdminId: params.adminId,
        changedByName: params.adminName,
      });
    }

    if (nextDeliveryStatus !== order.deliveryStatus) {
      await tx
        .update(deliveries)
        .set({
          deliveryStatus: nextDeliveryStatus,
          actualDeliveryDate:
            nextDeliveryStatus === 'Delivered' ? new Date().toISOString().slice(0, 10) : '',
          updatedAt: new Date(),
        })
        .where(eq(deliveries.orderId, order.id));
    }

    return { previous: order, updated: updatedOrder, stockRestored: shouldRestoreStock };
  });

  // Notify customer on milestone transitions
  const eventMap: Partial<Record<OrderStatus, Parameters<typeof dispatchNotification>[0]['event']>> = {
    Confirmed: 'order_confirmed',
    Shipped: 'order_shipped',
    'Out for Delivery': 'out_for_delivery',
    Delivered: 'delivered',
    Cancelled: 'order_cancelled',
  };
  const notifEvent = eventMap[params.newStatus];
  if (notifEvent) {
    await dispatchNotification({
      channel: 'sms',
      event: notifEvent,
      recipient: result.updated.customerPhone,
      subject: `QAYZ Order ${result.updated.orderNumber}: ${params.newStatus}`,
      payload: {
        orderNumber: result.updated.orderNumber,
        status: params.newStatus,
      },
    });
  }

  return result;
}

