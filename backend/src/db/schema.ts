import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// 1. Storefront Customer Users (optional registered accounts for future loyalty/history)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 2. Admin Roles
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  isSystem: boolean('is_system').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 3. Permissions
export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  module: text('module').notNull(),
  description: text('description').notNull().default(''),
});

// 4. Role Permissions Mapping
export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: serial('id').primaryKey(),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: integer('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    rolePermUnique: uniqueIndex('role_perm_unique_idx').on(table.roleId, table.permissionId),
  })
);

// 5. Admin Users
export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  roleId: integer('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'restrict' }),
  isActive: boolean('is_active').notNull().default(true),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 6. Categories
export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description').notNull().default(''),
    imageUrl: text('image_url').notNull().default(''),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index('categories_slug_idx').on(table.slug),
  })
);

// 7. Products
export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    subtitle: text('subtitle').notNull().default(''),
    description: text('description').notNull(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    basePrice: integer('base_price').notNull(),
    discountType: text('discount_type').notNull().default('none'), // 'none' | 'percentage' | 'fixed'
    discountValue: integer('discount_value').notNull().default(0),
    fabric: text('fabric').notNull().default('Pure Cotton'),
    fit: text('fit').notNull().default('Tailored Regular Fit'),
    careInstructions: text('care_instructions').notNull().default('Dry clean or gentle cold wash'),
    craftDetails: text('craft_details').notNull().default(''),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    isFeatured: boolean('is_featured').notNull().default(false),
    isBestSeller: boolean('is_best_seller').notNull().default(false),
    isNewArrival: boolean('is_new_arrival').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    isArchived: boolean('is_archived').notNull().default(false),
    seoTitle: text('seo_title').notNull().default(''),
    seoDescription: text('seo_description').notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index('products_slug_idx').on(table.slug),
    catActiveIdx: index('products_cat_active_idx').on(table.categoryId, table.isActive, table.isArchived),
  })
);

// 8. Product Images
export const productImages = pgTable(
  'product_images',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    altText: text('alt_text').notNull().default(''),
    displayOrder: integer('display_order').notNull().default(0),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index('product_images_product_idx').on(table.productId),
  })
);

// 9. Product Variants (Color + Size + SKU)
export const productVariants = pgTable(
  'product_variants',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull().unique(),
    color: text('color').notNull(),
    colorHex: text('color_hex').notNull().default('#111827'),
    size: text('size').notNull(),
    priceOverride: integer('price_override'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index('product_variants_product_idx').on(table.productId),
    skuIdx: index('product_variants_sku_idx').on(table.sku),
  })
);

// 10. Inventory
export const inventory = pgTable(
  'inventory',
  {
    id: serial('id').primaryKey(),
    variantId: integer('variant_id')
      .notNull()
      .unique()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    currentStock: integer('current_stock').notNull().default(0),
    reservedStock: integer('reserved_stock').notNull().default(0),
    availableStock: integer('available_stock').notNull().default(0),
    soldQuantity: integer('sold_quantity').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    variantIdx: index('inventory_variant_idx').on(table.variantId),
  })
);

// 11. Inventory Transactions Ledger
export const inventoryTransactions = pgTable(
  'inventory_transactions',
  {
    id: serial('id').primaryKey(),
    variantId: integer('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    inventoryId: integer('inventory_id')
      .notNull()
      .references(() => inventory.id, { onDelete: 'cascade' }),
    changeAmount: integer('change_amount').notNull(),
    previousStock: integer('previous_stock').notNull(),
    newStock: integer('new_stock').notNull(),
    reason: text('reason').notNull(), // 'Initial Stock' | 'Purchase/Restock' | 'Order' | 'Order Cancellation' | 'Return' | 'Manual Adjustment' | 'Damaged'
    referenceType: text('reference_type'),
    referenceId: text('reference_id'),
    note: text('note').notNull().default(''),
    performedByAdminId: integer('performed_by_admin_id').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    variantIdx: index('inv_tx_variant_idx').on(table.variantId),
    createdIdx: index('inv_tx_created_idx').on(table.createdAt),
  })
);

// 12. Customers
export const customers = pgTable(
  'customers',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    phone: text('phone').notNull().unique(),
    email: text('email'),
    totalOrders: integer('total_orders').notNull().default(0),
    totalSpent: integer('total_spent').notNull().default(0),
    firstSource: text('first_source').notNull().default('Direct'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    phoneIdx: index('customers_phone_idx').on(table.phone),
  })
);

// 13. Customer Addresses
export const addresses = pgTable('addresses', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  label: text('label').notNull().default('Home'),
  recipientName: text('recipient_name').notNull(),
  phone: text('phone').notNull(),
  addressLine: text('address_line').notNull(),
  area: text('area').notNull(),
  city: text('city').notNull(),
  postalCode: text('postal_code').notNull().default(''),
  isDefault: boolean('is_default').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 14. Carts (persistent & abandoned cart tracking)
export const carts = pgTable(
  'carts',
  {
    id: serial('id').primaryKey(),
    sessionToken: text('session_token').notNull().unique(),
    customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    couponCode: text('coupon_code'),
    status: text('status').notNull().default('active'), // 'active' | 'converted' | 'abandoned'
    customerName: text('customer_name'),
    customerEmail: text('customer_email'),
    customerPhone: text('customer_phone'),
    checkoutStarted: boolean('checkout_started').notNull().default(false),
    lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    sessionTokenIdx: index('carts_session_token_idx').on(table.sessionToken),
    statusIdx: index('carts_status_idx').on(table.status),
  })
);

// 15. Cart Items
export const cartItems = pgTable(
  'cart_items',
  {
    id: serial('id').primaryKey(),
    cartId: integer('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: integer('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    cartVariantUnique: uniqueIndex('cart_variant_unique_idx').on(table.cartId, table.variantId),
  })
);

// 16. Coupons
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  description: text('description').notNull().default(''),
  discountType: text('discount_type').notNull().default('percentage'), // 'percentage' | 'fixed'
  discountValue: integer('discount_value').notNull(),
  minOrderAmount: integer('min_order_amount').notNull().default(0),
  maxDiscountAmount: integer('max_discount_amount'),
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 17. Delivery Zones
export const deliveryZones = pgTable('delivery_zones', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  charge: integer('charge').notNull(),
  freeShippingThreshold: integer('free_shipping_threshold'),
  estimatedDays: text('estimated_days').notNull().default('2-3 Business Days'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 18. Orders
export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    orderNumber: text('order_number').notNull().unique(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    customerEmail: text('customer_email'),
    deliveryAddress: text('delivery_address').notNull(),
    city: text('city').notNull(),
    area: text('area').notNull(),
    postalCode: text('postal_code').notNull().default(''),
    deliveryInstructions: text('delivery_instructions').notNull().default(''),
    deliveryZoneId: integer('delivery_zone_id').references(() => deliveryZones.id, {
      onDelete: 'set null',
    }),
    subtotal: integer('subtotal').notNull(),
    discountAmount: integer('discount_amount').notNull().default(0),
    couponCode: text('coupon_code'),
    deliveryCharge: integer('delivery_charge').notNull().default(0),
    totalAmount: integer('total_amount').notNull(),
    paymentMethod: text('payment_method').notNull().default('cod'), // 'cod' | 'online' | 'bkash'
    paymentStatus: text('payment_status').notNull().default('pending'), // 'pending' | 'paid' | 'failed' | 'refunded'
    orderStatus: text('order_status').notNull().default('Pending'),
    deliveryStatus: text('delivery_status').notNull().default('Pending'),
    internalNotes: text('internal_notes').notNull().default(''),
    sourceSessionId: text('source_session_id'),
    trafficSource: text('traffic_source').notNull().default('Direct'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    orderNumIdx: index('orders_number_idx').on(table.orderNumber),
    phoneIdx: index('orders_phone_idx').on(table.customerPhone),
    statusIdx: index('orders_status_idx').on(table.orderStatus),
    createdIdx: index('orders_created_idx').on(table.createdAt),
  })
);

// 19. Order Items
export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    variantId: integer('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'restrict' }),
    productName: text('product_name').notNull(),
    variantSku: text('variant_sku').notNull(),
    variantColor: text('variant_color').notNull(),
    variantSize: text('variant_size').notNull(),
    unitPrice: integer('unit_price').notNull(),
    discountPerUnit: integer('discount_per_unit').notNull().default(0),
    finalUnitPrice: integer('final_unit_price').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotal: integer('line_total').notNull(),
  },
  (table) => ({
    orderIdx: index('order_items_order_idx').on(table.orderId),
  })
);

// 20. Order Status History (immutable transition audit)
export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    previousStatus: text('previous_status'),
    newStatus: text('new_status').notNull(),
    statusType: text('status_type').notNull().default('order'), // 'order' | 'delivery' | 'payment'
    note: text('note').notNull().default(''),
    changedByAdminId: integer('changed_by_admin_id').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    changedByName: text('changed_by_name').notNull().default('System'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index('order_history_order_idx').on(table.orderId),
  })
);

// 21. Payments (extensible provider abstraction)
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull().default('cod'), // 'cod' | 'sslcommerz' | 'bkash' | 'stripe'
  method: text('method').notNull().default('cod'),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('BDT'),
  status: text('status').notNull().default('pending'), // 'pending' | 'paid' | 'failed' | 'refunded'
  transactionRef: text('transaction_ref'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 22. Deliveries
export const deliveries = pgTable('deliveries', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: 'cascade' }),
  deliveryZoneId: integer('delivery_zone_id').references(() => deliveryZones.id, {
    onDelete: 'set null',
  }),
  courierPartner: text('courier_partner').notNull().default('QAYZ Express Courier'),
  trackingNumber: text('tracking_number').notNull().default(''),
  deliveryCharge: integer('delivery_charge').notNull().default(0),
  deliveryStatus: text('delivery_status').notNull().default('Pending'),
  estimatedDeliveryDate: text('estimated_delivery_date').notNull().default(''),
  actualDeliveryDate: text('actual_delivery_date').notNull().default(''),
  deliveryNotes: text('delivery_notes').notNull().default(''),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 23. Visitor Sessions (Traffic & UTM Attribution)
export const sessions = pgTable(
  'sessions',
  {
    id: serial('id').primaryKey(),
    visitorId: text('visitor_id').notNull(),
    sessionToken: text('session_token').notNull().unique(),
    isReturning: boolean('is_returning').notNull().default(false),
    trafficSource: text('traffic_source').notNull().default('Direct'), // Google | Facebook | Instagram | TikTok | Direct | Referral | Other
    referrer: text('referrer').notNull().default(''),
    landingPage: text('landing_page').notNull().default('/'),
    utmSource: text('utm_source').notNull().default(''),
    utmMedium: text('utm_medium').notNull().default(''),
    utmCampaign: text('utm_campaign').notNull().default(''),
    utmTerm: text('utm_term').notNull().default(''),
    utmContent: text('utm_content').notNull().default(''),
    deviceType: text('device_type').notNull().default('Desktop'),
    browser: text('browser').notNull().default('Unknown'),
    os: text('os').notNull().default('Unknown'),
    country: text('country').notNull().default('Bangladesh'),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    pageViews: integer('page_views').notNull().default(1),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
  },
  (table) => ({
    sourceIdx: index('sessions_source_idx').on(table.trafficSource),
    visitorIdx: index('sessions_visitor_idx').on(table.visitorId),
    startedIdx: index('sessions_started_idx').on(table.startedAt),
  })
);

// 24. Analytics Events (Customer Behavior, Funnel, Search & Dwell)
export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    sessionToken: text('session_token').notNull().default(''),
    visitorId: text('visitor_id').notNull().default(''),
    eventType: text('event_type').notNull(),
    productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
    variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    cartId: integer('cart_id').references(() => carts.id, { onDelete: 'set null' }),
    searchQuery: text('search_query'),
    searchResultsCount: integer('search_results_count'),
    selectedSize: text('selected_size'),
    selectedColor: text('selected_color'),
    dwellTimeSeconds: integer('dwell_time_seconds'),
    pagePath: text('page_path').notNull().default('/'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    eventTypeCreatedIdx: index('analytics_event_type_created_idx').on(table.eventType, table.createdAt),
    productIdx: index('analytics_product_idx').on(table.productId),
    sessionIdx: index('analytics_session_idx').on(table.sessionId),
  })
);

// 25. Audit Logs
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    adminUserId: integer('admin_user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    adminEmail: text('admin_email').notNull().default('system'),
    adminRole: text('admin_role').notNull().default('system'),
    action: text('action').notNull(),
    resource: text('resource').notNull(),
    resourceId: text('resource_id').notNull().default(''),
    previousValue: jsonb('previous_value').$type<Record<string, unknown> | null>(),
    newValue: jsonb('new_value').$type<Record<string, unknown> | null>(),
    ipAddress: text('ip_address').notNull().default(''),
    userAgent: text('user_agent').notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    resourceIdx: index('audit_logs_resource_idx').on(table.resource, table.createdAt),
    adminIdx: index('audit_logs_admin_idx').on(table.adminUserId),
  })
);

// 26. Store Settings
export const storeSettings = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').$type<unknown>().notNull(),
  updatedByAdminId: integer('updated_by_admin_id').references(() => adminUsers.id, {
    onDelete: 'set null',
  }),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 27. Notification Logs (Extensible Email / SMS / WhatsApp / Push Architecture)
export const notificationLogs = pgTable('notification_logs', {
  id: serial('id').primaryKey(),
  channel: text('channel').notNull(), // 'email' | 'sms' | 'whatsapp' | 'push' | 'internal'
  event: text('event').notNull(),
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  status: text('status').notNull().default('queued'), // 'queued' | 'sent' | 'failed'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

