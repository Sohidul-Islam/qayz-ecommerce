import { sql } from 'drizzle-orm';
import { db } from './index.js';
import {
  adminUsers,
  analyticsEvents,
  auditLogs,
  cartItems,
  carts,
  categories,
  coupons,
  customers,
  deliveries,
  deliveryZones,
  inventory,
  inventoryTransactions,
  notificationLogs,
  orderItems,
  orders,
  orderStatusHistory,
  payments,
  permissions,
  productImages,
  products,
  productVariants,
  rolePermissions,
  roles,
  sessions,
  storeSettings,
} from './schema.js';
import { hashPassword } from '../middleware/auth.js';
import { runMigrations } from './migrate.js';

export async function seedDatabaseIfEmpty(force = false): Promise<void> {
  const existingProducts = await db.select({ count: sql<number>`count(*)::int` }).from(products);
  if (!force && (existingProducts[0]?.count ?? 0) > 0) {
    return;
  }

  console.log('Seeding QAYZ Punjabi E-Commerce database...');

  // 1. Permissions
  const permDefs = [
    { code: 'dashboard.view', name: 'View Dashboard', module: 'Dashboard', description: 'Access executive KPI overview' },
    { code: 'products.view', name: 'View Products', module: 'Catalog', description: 'View products and categories' },
    { code: 'products.manage', name: 'Manage Products', module: 'Catalog', description: 'Create, edit, archive products and categories' },
    { code: 'inventory.view', name: 'View Inventory', module: 'Inventory', description: 'View variant stock levels and ledger' },
    { code: 'inventory.manage', name: 'Manage Inventory', module: 'Inventory', description: 'Restock, adjust, and log damaged inventory' },
    { code: 'orders.view', name: 'View Orders', module: 'Orders', description: 'View customer orders, deliveries, and customer directory' },
    { code: 'orders.manage', name: 'Manage Orders', module: 'Orders', description: 'Update order status, delivery courier, and internal notes' },
    { code: 'analytics.view', name: 'View Analytics', module: 'Analytics', description: 'Access visitor, funnel, search, and abandoned cart analytics' },
    { code: 'users.manage', name: 'Manage Admin Users & Roles', module: 'Security', description: 'Create admin users and modify role permissions' },
    { code: 'audit.view', name: 'View Audit Logs', module: 'Security', description: 'Inspect administrative audit logs' },
    { code: 'settings.manage', name: 'Manage Store Settings', module: 'Settings', description: 'Configure delivery zones, coupons, and store settings' },
  ];

  const insertedPerms = await db.insert(permissions).values(permDefs).onConflictDoNothing().returning();
  const allPerms = insertedPerms.length > 0 ? insertedPerms : await db.select().from(permissions);
  const permByCode = new Map(allPerms.map((p) => [p.code, p.id]));

  // 2. Roles
  const roleDefs = [
    {
      name: 'Super Admin',
      slug: 'super_admin',
      description: 'Unrestricted access across all platform modules, security, and settings',
      perms: allPerms.map((p) => p.code),
    },
    {
      name: 'Admin',
      slug: 'admin',
      description: 'Full operational management excluding root security changes',
      perms: [
        'dashboard.view',
        'products.view',
        'products.manage',
        'inventory.view',
        'inventory.manage',
        'orders.view',
        'orders.manage',
        'analytics.view',
        'audit.view',
        'settings.manage',
      ],
    },
    {
      name: 'Order Manager',
      slug: 'order_manager',
      description: 'Processes customer orders, updates statuses, and assigns couriers',
      perms: ['dashboard.view', 'orders.view', 'orders.manage', 'inventory.view'],
    },
    {
      name: 'Inventory Manager',
      slug: 'inventory_manager',
      description: 'Monitors stock alerts, restocks variants, and audits stock movements',
      perms: ['dashboard.view', 'products.view', 'inventory.view', 'inventory.manage'],
    },
    {
      name: 'Content Manager',
      slug: 'content_manager',
      description: 'Curates products, imagery, categories, and SEO metadata',
      perms: ['dashboard.view', 'products.view', 'products.manage'],
    },
    {
      name: 'Analytics Viewer',
      slug: 'analytics_viewer',
      description: 'Read-only access to dashboard KPIs, funnels, and traffic attribution',
      perms: ['dashboard.view', 'analytics.view', 'products.view', 'orders.view'],
    },
  ];

  const roleIdBySlug = new Map<string, number>();
  for (const r of roleDefs) {
    const [insertedRole] = await db
      .insert(roles)
      .values({ name: r.name, slug: r.slug, description: r.description, isSystem: true })
      .onConflictDoNothing()
      .returning();

    const roleRow =
      insertedRole ||
      (await db.select().from(roles).where(sql`${roles.slug} = ${r.slug}`))[0];
    roleIdBySlug.set(r.slug, roleRow.id);

    for (const pCode of r.perms) {
      const pid = permByCode.get(pCode);
      if (pid) {
        await db
          .insert(rolePermissions)
          .values({ roleId: roleRow.id, permissionId: pid })
          .onConflictDoNothing();
      }
    }
  }

  // 3. Admin Users (Default password: Admin@12345!)
  const defaultPassHash = await hashPassword('Admin@12345!');
  const adminSeeds = [
    { name: 'Tariq Rahman', email: 'admin@qayz.com', roleSlug: 'super_admin' },
    { name: 'Nadia Karim', email: 'manager@qayz.com', roleSlug: 'admin' },
    { name: 'Rashed Hasan', email: 'orders@qayz.com', roleSlug: 'order_manager' },
    { name: 'Sajid Mahmud', email: 'inventory@qayz.com', roleSlug: 'inventory_manager' },
    { name: 'Farhana Islam', email: 'content@qayz.com', roleSlug: 'content_manager' },
    { name: 'Arman Chowdhury', email: 'analytics@qayz.com', roleSlug: 'analytics_viewer' },
  ];

  let superAdminId = 1;
  for (const a of adminSeeds) {
    const [createdAdmin] = await db
      .insert(adminUsers)
      .values({
        name: a.name,
        email: a.email,
        passwordHash: defaultPassHash,
        roleId: roleIdBySlug.get(a.roleSlug)!,
        isActive: true,
      })
      .onConflictDoNothing()
      .returning();
    if (a.roleSlug === 'super_admin' && createdAdmin) {
      superAdminId = createdAdmin.id;
    }
  }

  // 4. Categories
  const categorySeeds = [
    {
      name: 'Royal Heritage Embroidered',
      slug: 'royal-heritage-embroidered',
      description: 'Signature zari, zardozi, and artisanal collar embroidery tailored for grand occasions.',
      imageUrl: '/images/products/punjabi-zafar-obsidian.png',
      displayOrder: 1,
    },
    {
      name: 'Artisanal Handloom Muslin & Silk',
      slug: 'artisanal-muslin-silk',
      description: 'Authentic Dhaka Jamdani weaves, raw Tussar silk, and breathable Matka textures.',
      imageUrl: '/images/products/punjabi-aarav-ivory.png',
      displayOrder: 2,
    },
    {
      name: 'Signature Minimalist Everyday',
      slug: 'signature-minimalist-everyday',
      description: 'Clean architectural silhouettes in Belgian linen and mercerized Supima cotton.',
      imageUrl: '/images/products/punjabi-rayan-sand.png',
      displayOrder: 3,
    },
    {
      name: 'Festive & Eid Collection',
      slug: 'festive-eid-collection',
      description: 'Refined jewel tones and Lucknowi chikankari built for Eid and cultural celebrations.',
      imageUrl: '/images/products/punjabi-mirza-oxblood.png',
      displayOrder: 4,
    },
    {
      name: 'Wedding & Nikah Atelier',
      slug: 'wedding-nikah-atelier',
      description: 'Heirloom-grade sherwani-cut Panjabis finished with hand-crafted metallic buttons.',
      imageUrl: '/images/products/punjabi-nawab-emerald.png',
      displayOrder: 5,
    },
  ];

  const insertedCats = await db.insert(categories).values(categorySeeds).returning();
  const catBySlug = new Map(insertedCats.map((c) => [c.slug, c.id]));

  // 5. Realistic Premium Punjabi Products + Variants + Inventory
  const productCatalog = [
    {
      name: 'Zafar Obsidian Zari-Collar Silk Panjabi',
      slug: 'zafar-obsidian-zari-silk-panjabi',
      subtitle: 'Hand-spun black raw silk with antique metallic collar embroidery',
      description:
        'Cut from medium-weight mulberry raw silk, the Zafar Obsidian Panjabi balances architectural restraint with refined heritage craft. A structured band collar and concealed placket are framed with fine antique gold resham-zari stitchwork, while deep side slits allow effortless movement throughout evening receptions.',
      categorySlug: 'royal-heritage-embroidered',
      basePrice: 6850,
      discountType: 'percentage',
      discountValue: 10,
      fabric: '100% Mulberry Raw Silk',
      fit: 'Tailored Classic Fit',
      careInstructions: 'Professional dry clean only. Store folded in breathable muslin garment bag.',
      craftDetails: 'Hand-guided zari collar motif taking 14 artisan hours per garment.',
      tags: ['silk', 'eid', 'black', 'zari', 'evening', 'luxury'],
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      images: [
        '/images/products/punjabi-zafar-obsidian.png',
        '/images/products/punjabi-tariq-midnight.png',
      ],
      colors: [
        { name: 'Obsidian Black', hex: '#141416' },
        { name: 'Charcoal Smoke', hex: '#33363D' },
      ],
      sizes: [
        { size: 'M', stock: 18 },
        { size: 'L', stock: 12 },
        { size: 'XL', stock: 4 }, // Low stock alert
        { size: 'XXL', stock: 6 },
      ],
    },
    {
      name: 'Aarav Ivory Handloom Jamdani Panjabi',
      slug: 'aarav-ivory-handloom-jamdani-panjabi',
      subtitle: 'Breathable Dhaka Jamdani weave in warm unbleached ivory',
      description:
        'Woven on traditional pit looms in Narayanganj, the Aarav Ivory Jamdani Panjabi brings centuries-old Bangladeshi textile artistry to a crisp modern silhouette. Featherlight cotton-silk yarn keeps you cool in humid tropical afternoons while tonal geometric buti motifs catch natural daylight.',
      categorySlug: 'artisanal-muslin-silk',
      basePrice: 7400,
      discountType: 'none',
      discountValue: 0,
      fabric: '80% Fine Jamdani Cotton, 20% Mulberry Silk',
      fit: 'Relaxed Tailored Fit',
      careInstructions: 'Dry clean recommended or cold hand-wash inside out with mild detergent.',
      craftDetails: 'Authentic handwoven Jamdani geometric motifs with mother-of-pearl buttons.',
      tags: ['jamdani', 'ivory', 'handloom', 'eid', 'nikah', 'summer'],
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: true,
      images: [
        '/images/products/punjabi-aarav-ivory.png',
        '/images/products/punjabi-farhan-pearl.png',
      ],
      colors: [
        { name: 'Warm Ivory', hex: '#F3ECE0' },
        { name: 'Alabaster Cream', hex: '#E8DFCF' },
      ],
      sizes: [
        { size: 'S', stock: 9 },
        { size: 'M', stock: 15 },
        { size: 'L', stock: 3 }, // Low stock
        { size: 'XL', stock: 0 }, // Out of stock demo
      ],
    },
    {
      name: 'Mirza Oxblood Chikankari Festive Panjabi',
      slug: 'mirza-oxblood-chikankari-festive-panjabi',
      subtitle: 'Deep burgundy cotton-silk enriched with tonal floral embroidery',
      description:
        'Rich oxblood maroon meets delicate tonal threadwork across the chest placket and cuffs. Crafted from soft cotton-viscose silk blend with a lustrous matte sheen, the Mirza Panjabi transitions seamlessly from daytime dawat gatherings to candlelit festive dinners.',
      categorySlug: 'festive-eid-collection',
      basePrice: 5400,
      discountType: 'fixed',
      discountValue: 500,
      fabric: 'Cotton-Silk Blend (70/30)',
      fit: 'Slim Tailored Fit',
      careInstructions: 'Dry clean or gentle cold wash. Steam press on low heat.',
      craftDetails: 'Tonal chain-stitch & shadow chikankari along French-seamed placket.',
      tags: ['oxblood', 'maroon', 'chikankari', 'festive', 'eid'],
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      images: [
        '/images/products/punjabi-mirza-oxblood.png',
        '/images/products/punjabi-sultaan-espresso.png',
      ],
      colors: [
        { name: 'Oxblood Maroon', hex: '#581C24' },
        { name: 'Deep Garnet', hex: '#73232D' },
      ],
      sizes: [
        { size: 'M', stock: 22 },
        { size: 'L', stock: 19 },
        { size: 'XL', stock: 11 },
        { size: 'XXL', stock: 5 },
      ],
    },
    {
      name: 'Rayan Sandwashed Belgian Linen Panjabi',
      slug: 'rayan-sandwashed-belgian-linen-panjabi',
      subtitle: 'Ultra-breathable enzyme-washed linen for effortless everyday refinement',
      description:
        'Designed for the modern purist, the Rayan Panjabi is tailored from 100% European flax linen that undergoes an enzyme sandwash for instant softness against the skin. Minimalist horn buttons and zero exterior ornamentation highlight the beauty of pure fabric drape.',
      categorySlug: 'signature-minimalist-everyday',
      basePrice: 3650,
      discountType: 'none',
      discountValue: 0,
      fabric: '100% Sandwashed Belgian Linen',
      fit: 'Modern Relaxed Fit',
      careInstructions: 'Machine wash cold gentle cycle. Hang dry in shade.',
      craftDetails: 'Single-needle French tailoring with natural smoked horn buttons.',
      tags: ['linen', 'minimal', 'beige', 'sand', 'everyday', 'summer'],
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      images: [
        '/images/products/punjabi-rayan-sand.png',
        '/images/products/punjabi-kabir-tussar.png',
      ],
      colors: [
        { name: 'Desert Sand', hex: '#D6C4AA' },
        { name: 'Oatmeal Stone', hex: '#C7BA9F' },
      ],
      sizes: [
        { size: 'S', stock: 14 },
        { size: 'M', stock: 28 },
        { size: 'L', stock: 24 },
        { size: 'XL', stock: 16 },
      ],
    },
    {
      name: 'Nawab Emerald Gold-Thread Sherwani-Cut Panjabi',
      slug: 'nawab-emerald-gold-sherwani-panjabi',
      subtitle: 'Regal emerald green jacquard silk tailored for weddings and nikah',
      description:
        'Tailored with a structured sherwani-inspired stand collar and subtle tone-on-tone woven damask texture, the Nawab Emerald Panjabi commands quiet presence at weddings, holud nights, and formal family milestones. Finished with custom antique brass buttons.',
      categorySlug: 'wedding-nikah-atelier',
      basePrice: 9200,
      discountType: 'percentage',
      discountValue: 8,
      fabric: 'Woven Jacquard Silk-Cotton',
      fit: 'Structured Tailored Fit',
      careInstructions: 'Dry clean only.',
      craftDetails: 'Hand-braided antique gold dori piping and custom cast brass buttons.',
      tags: ['emerald', 'green', 'wedding', 'nikah', 'sherwani', 'luxury'],
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      images: [
        '/images/products/punjabi-nawab-emerald.png',
        '/images/products/punjabi-zafar-obsidian.png',
      ],
      colors: [
        { name: 'Royal Emerald', hex: '#144233' },
      ],
      sizes: [
        { size: 'M', stock: 8 },
        { size: 'L', stock: 4 },
        { size: 'XL', stock: 7 },
        { size: 'XXL', stock: 5 },
      ],
    },
    {
      name: 'Tariq Midnight Supima Cotton Minimal Panjabi',
      slug: 'tariq-midnight-supima-minimal-panjabi',
      subtitle: 'Crisp concealed-placket panjabi in long-staple mercerized cotton',
      description:
        'Woven from extra-long-staple Supima cotton yarn and double-mercerized for a deep midnight luster, the Tariq Panjabi delivers razor-sharp minimalism. Features an invisible concealed placket, precision collar stay construction, and twin deep side pockets.',
      categorySlug: 'signature-minimalist-everyday',
      basePrice: 3250,
      discountType: 'none',
      discountValue: 0,
      fabric: '100% Double-Mercerized Supima Cotton',
      fit: 'Tailored Slim Fit',
      careInstructions: 'Cold machine wash with like colors. Warm steam iron.',
      craftDetails: 'Concealed button placket with reinforced 18-stitches-per-inch seams.',
      tags: ['navy', 'midnight', 'cotton', 'minimal', 'office', 'everyday'],
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      images: [
        '/images/products/punjabi-tariq-midnight.png',
        '/images/products/punjabi-zayan-indigo.png',
      ],
      colors: [
        { name: 'Midnight Navy', hex: '#182438' },
        { name: 'Slate Graphite', hex: '#2F3640' },
      ],
      sizes: [
        { size: 'S', stock: 12 },
        { size: 'M', stock: 30 },
        { size: 'L', stock: 26 },
        { size: 'XL', stock: 18 },
        { size: 'XXL', stock: 9 },
      ],
    },
    {
      name: 'Kabir Sandstone Raw Tussar Silk Panjabi',
      slug: 'kabir-sandstone-tussar-silk-panjabi',
      subtitle: 'Organic textured champagne Tussar silk for daytime elegance',
      description:
        'Celebrated for its natural slub texture and warm golden-champagne undertone, the Kabir Tussar Silk Panjabi brings effortless sophistication to Jummah mornings, wedding luncheons, and cultural soirées.',
      categorySlug: 'artisanal-muslin-silk',
      basePrice: 6400,
      discountType: 'none',
      discountValue: 0,
      fabric: 'Authentic Textured Tussar Silk',
      fit: 'Classic Comfort Fit',
      careInstructions: 'Dry clean only to preserve raw silk grain.',
      craftDetails: 'Handwoven tussar warp with brushed wooden-core silk-wrapped buttons.',
      tags: ['tussar', 'silk', 'gold', 'champagne', 'wedding', 'heritage'],
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      images: [
        '/images/products/punjabi-kabir-tussar.png',
        '/images/products/punjabi-rayan-sand.png',
      ],
      colors: [
        { name: 'Champagne Sandstone', hex: '#C6A979' },
      ],
      sizes: [
        { size: 'M', stock: 10 },
        { size: 'L', stock: 11 },
        { size: 'XL', stock: 6 },
      ],
    },
    {
      name: 'Zayan Indigo Ajrak-Placket Heritage Panjabi',
      slug: 'zayan-indigo-ajrak-heritage-panjabi',
      subtitle: 'Natural indigo slub cotton accented with artisanal block-print trim',
      description:
        'A contemporary homage to South Asian block-printing heritage. Crafted from rich indigo-dyed slub cotton with a subtle geometric Ajrak lining tucked neatly along the inner collar and cuff edge for understated character.',
      categorySlug: 'festive-eid-collection',
      basePrice: 3950,
      discountType: 'percentage',
      discountValue: 15,
      fabric: '100% Organic Indigo Slub Cotton',
      fit: 'Tailored Regular Fit',
      careInstructions: 'Wash separately in cold water for first two washes.',
      craftDetails: 'Hand-carved wooden block printed interior collar & cuff facing.',
      tags: ['indigo', 'ajrak', 'cotton', 'heritage', 'casual'],
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      images: [
        '/images/products/punjabi-zayan-indigo.png',
        '/images/products/punjabi-tariq-midnight.png',
      ],
      colors: [
        { name: 'Natural Indigo', hex: '#223A5E' },
      ],
      sizes: [
        { size: 'S', stock: 14 },
        { size: 'M', stock: 21 },
        { size: 'L', stock: 18 },
        { size: 'XL', stock: 12 },
      ],
    },
    {
      name: 'Farhan Pearl White Lucknowi Shadow-Work Panjabi',
      slug: 'farhan-pearl-white-lucknowi-panjabi',
      subtitle: 'Crisp pearl cotton muslin with intricate white-on-white chikankari',
      description:
        'Timeless purity in motion. The Farhan Panjabi features delicate tonal shadow-work embroidery across breathable fine muslin cotton, making it an eternal essential for Eid-ul-Fitr, Nikah ceremonies, and auspicious morning prayers.',
      categorySlug: 'wedding-nikah-atelier',
      basePrice: 5800,
      discountType: 'none',
      discountValue: 0,
      fabric: '100% Fine Combed Cotton Muslin',
      fit: 'Tailored Regular Fit',
      careInstructions: 'Gentle hand wash cold or dry clean.',
      craftDetails: 'Fine white-on-white bakhiya and tepchi artisanal embroidery.',
      tags: ['white', 'pearl', 'nikah', 'eid', 'chikankari', 'muslin'],
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      images: [
        '/images/products/punjabi-farhan-pearl.png',
        '/images/products/punjabi-aarav-ivory.png',
      ],
      colors: [
        { name: 'Pearl White', hex: '#F9F9F7' },
      ],
      sizes: [
        { size: 'S', stock: 10 },
        { size: 'M', stock: 16 },
        { size: 'L', stock: 14 },
        { size: 'XL', stock: 8 },
        { size: 'XXL', stock: 3 },
      ],
    },
    {
      name: 'Sultaan Espresso Matka Silk Panjabi',
      slug: 'sultaan-espresso-matka-silk-panjabi',
      subtitle: 'Deep roasted espresso Matka silk with architectural pintuck placket',
      description:
        'Earthy, tactile, and unmistakably luxurious. Spun from rich espresso-dyed Matka silk with minimalist vertical pintuck pleats along the chest and matte bronze shank buttons, the Sultaan Panjabi offers modern heritage polish without flash.',
      categorySlug: 'royal-heritage-embroidered',
      basePrice: 7900,
      discountType: 'fixed',
      discountValue: 400,
      fabric: '100% Handloom Matka Silk',
      fit: 'Tailored Classic Fit',
      careInstructions: 'Dry clean only.',
      craftDetails: 'Precision micro-pintuck placket with antique bronze-toned buttons.',
      tags: ['espresso', 'brown', 'matka', 'silk', 'luxury', 'festive'],
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      images: [
        '/images/products/punjabi-sultaan-espresso.png',
        '/images/products/punjabi-mirza-oxblood.png',
      ],
      colors: [
        { name: 'Roasted Espresso', hex: '#3B2820' },
      ],
      sizes: [
        { size: 'M', stock: 11 },
        { size: 'L', stock: 9 },
        { size: 'XL', stock: 7 },
      ],
    },
  ];

  const insertedProducts: Array<{
    id: number;
    name: string;
    categoryId: number;
    basePrice: number;
    variants: Array<{ id: number; sku: string; color: string; size: string }>;
  }> = [];

  for (const p of productCatalog) {
    const catId = catBySlug.get(p.categorySlug)!;
    const [prod] = await db
      .insert(products)
      .values({
        name: p.name,
        slug: p.slug,
        subtitle: p.subtitle,
        description: p.description,
        categoryId: catId,
        basePrice: p.basePrice,
        discountType: p.discountType,
        discountValue: p.discountValue,
        fabric: p.fabric,
        fit: p.fit,
        careInstructions: p.careInstructions,
        craftDetails: p.craftDetails,
        tags: p.tags,
        isFeatured: p.isFeatured,
        isBestSeller: p.isBestSeller,
        isNewArrival: p.isNewArrival,
        isActive: true,
        isArchived: false,
        seoTitle: `${p.name} | QAYZ Punjabi Atelier`,
        seoDescription: p.subtitle,
      })
      .returning();

    for (let i = 0; i < p.images.length; i++) {
      await db.insert(productImages).values({
        productId: prod.id,
        url: p.images[i],
        altText: `${p.name} - View ${i + 1}`,
        displayOrder: i,
        isPrimary: i === 0,
      });
    }

    const vars: Array<{ id: number; sku: string; color: string; size: string }> = [];
    for (const c of p.colors) {
      for (const s of p.sizes) {
        const sku = `QYZ-${prod.id}-${c.name.slice(0, 3).toUpperCase()}-${s.size}`;
        const [variant] = await db
          .insert(productVariants)
          .values({
            productId: prod.id,
            sku,
            color: c.name,
            colorHex: c.hex,
            size: s.size,
            isActive: true,
          })
          .returning();

        const [inv] = await db
          .insert(inventory)
          .values({
            variantId: variant.id,
            currentStock: s.stock,
            reservedStock: 0,
            availableStock: s.stock,
            soldQuantity: Math.floor(Math.random() * 14) + 2,
            lowStockThreshold: 5,
          })
          .returning();

        if (s.stock > 0) {
          await db.insert(inventoryTransactions).values({
            variantId: variant.id,
            inventoryId: inv.id,
            changeAmount: s.stock,
            previousStock: 0,
            newStock: s.stock,
            reason: 'Initial Stock',
            referenceType: 'seed',
            referenceId: 'initial',
            note: 'Initial atelier batch allocation',
            performedByAdminId: superAdminId,
          });
        }

        vars.push({ id: variant.id, sku, color: c.name, size: s.size });
      }
    }

    insertedProducts.push({
      id: prod.id,
      name: prod.name,
      categoryId: catId,
      basePrice: p.basePrice,
      variants: vars,
    });
  }

  // 6. Delivery Zones & Coupons
  const zones = await db
    .insert(deliveryZones)
    .values([
      {
        name: 'Inside Dhaka Express',
        slug: 'inside-dhaka',
        charge: 80,
        freeShippingThreshold: 6500,
        estimatedDays: '24-48 Hours',
        isActive: true,
      },
      {
        name: 'Dhaka Suburbs (Savar / Gazipur / Narayanganj)',
        slug: 'dhaka-suburbs',
        charge: 120,
        freeShippingThreshold: 7500,
        estimatedDays: '2-3 Business Days',
        isActive: true,
      },
      {
        name: 'Nationwide Bangladesh Courier',
        slug: 'outside-dhaka',
        charge: 150,
        freeShippingThreshold: 8000,
        estimatedDays: '3-5 Business Days',
        isActive: true,
      },
    ])
    .returning();

  await db.insert(coupons).values([
    {
      code: 'ROYAL10',
      description: '10% Heritage Circle Privilege on orders above BDT 3,000',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 3000,
      maxDiscountAmount: 1500,
      isActive: true,
    },
    {
      code: 'EID500',
      description: 'BDT 500 Festive Saving on orders above BDT 5,000',
      discountType: 'fixed',
      discountValue: 500,
      minOrderAmount: 5000,
      isActive: true,
    },
    {
      code: 'WELCOME15',
      description: '15% First Atelier Order Welcome Offer',
      discountType: 'percentage',
      discountValue: 15,
      minOrderAmount: 2500,
      maxDiscountAmount: 2000,
      isActive: true,
    },
  ]);

  // 7. Sample Customers & 12 Realistic Orders across last 14 days
  const sampleOrdersData = [
    {
      name: 'Zahir Uddin',
      phone: '01711223344',
      email: 'zahir@example.com',
      address: 'House 24, Road 7, Banani',
      area: 'Banani',
      city: 'Dhaka',
      status: 'Delivered',
      delStatus: 'Delivered',
      payStatus: 'paid',
      payMethod: 'bkash',
      source: 'Instagram',
      daysAgo: 12,
      prodIdx: 0,
    },
    {
      name: 'Rafiqul Islam',
      phone: '01819445566',
      email: 'rafiq@example.com',
      address: 'Apt 4B, Lake View, Dhanmondi',
      area: 'Dhanmondi',
      city: 'Dhaka',
      status: 'Delivered',
      delStatus: 'Delivered',
      payStatus: 'paid',
      payMethod: 'cod',
      source: 'Facebook',
      daysAgo: 10,
      prodIdx: 1,
    },
    {
      name: 'Mehedi Hasan',
      phone: '01911778899',
      email: null,
      address: 'Sector 11, Road 14, Uttara',
      area: 'Uttara',
      city: 'Dhaka',
      status: 'Delivered',
      delStatus: 'Delivered',
      payStatus: 'paid',
      payMethod: 'online',
      source: 'Google',
      daysAgo: 8,
      prodIdx: 2,
    },
    {
      name: 'Tahmid Hossain',
      phone: '01675112233',
      email: 'tahmid@example.com',
      address: 'Nasirabad Housing Society, Block B',
      area: 'Nasirabad',
      city: 'Chattogram',
      status: 'Out for Delivery',
      delStatus: 'Out for Delivery',
      payStatus: 'pending',
      payMethod: 'cod',
      source: 'Instagram',
      daysAgo: 3,
      prodIdx: 4,
    },
    {
      name: 'Saifullah Khan',
      phone: '01755889900',
      email: 'saif@example.com',
      address: 'House 8, Road 90, Gulshan 2',
      area: 'Gulshan',
      city: 'Dhaka',
      status: 'Shipped',
      delStatus: 'In Transit',
      payStatus: 'paid',
      payMethod: 'online',
      source: 'Direct',
      daysAgo: 2,
      prodIdx: 8,
    },
    {
      name: 'Anisur Rahman',
      phone: '01722334455',
      email: null,
      address: 'Zindabazar Main Road, Sylhet',
      area: 'Zindabazar',
      city: 'Sylhet',
      status: 'Packed',
      delStatus: 'Assigned',
      payStatus: 'pending',
      payMethod: 'cod',
      source: 'TikTok',
      daysAgo: 2,
      prodIdx: 5,
    },
    {
      name: 'Faisal Mahmud',
      phone: '01822334455',
      email: 'faisal@example.com',
      address: 'Bashundhara R/A, Block D, Road 5',
      area: 'Bashundhara',
      city: 'Dhaka',
      status: 'Processing',
      delStatus: 'Pending',
      payStatus: 'paid',
      payMethod: 'bkash',
      source: 'Instagram',
      daysAgo: 1,
      prodIdx: 3,
    },
    {
      name: 'Noman Siddiqui',
      phone: '01933445566',
      email: 'noman@example.com',
      address: 'Baridhara DOHS, Lane 3',
      area: 'Baridhara',
      city: 'Dhaka',
      status: 'Confirmed',
      delStatus: 'Pending',
      payStatus: 'pending',
      payMethod: 'cod',
      source: 'Google',
      daysAgo: 0,
      prodIdx: 0,
    },
    {
      name: 'Imran Chowdhury',
      phone: '01744556677',
      email: null,
      address: 'Mirpur 10, Avenue 2',
      area: 'Mirpur',
      city: 'Dhaka',
      status: 'Pending',
      delStatus: 'Pending',
      payStatus: 'pending',
      payMethod: 'cod',
      source: 'Facebook',
      daysAgo: 0,
      prodIdx: 7,
    },
    {
      name: 'Kamrul Hasan',
      phone: '01855667788',
      email: 'kamrul@example.com',
      address: 'Rajshahi Sadar, Upashahar',
      area: 'Upashahar',
      city: 'Rajshahi',
      status: 'Cancelled',
      delStatus: 'Failed',
      payStatus: 'failed',
      payMethod: 'cod',
      source: 'TikTok',
      daysAgo: 5,
      prodIdx: 6,
    },
    {
      name: 'Shafiqul Alam',
      phone: '01766778899',
      email: 'shafiq@example.com',
      address: 'Mohakhali DOHS, Road 12',
      area: 'Mohakhali',
      city: 'Dhaka',
      status: 'Delivered',
      delStatus: 'Delivered',
      payStatus: 'paid',
      payMethod: 'bkash',
      source: 'Instagram',
      daysAgo: 6,
      prodIdx: 9,
    },
    {
      name: 'Ashraf Ali',
      phone: '01977889900',
      email: 'ashraf@example.com',
      address: 'Khulna Sonadanga Phase 2',
      area: 'Sonadanga',
      city: 'Khulna',
      status: 'Returned',
      delStatus: 'Returned',
      payStatus: 'refunded',
      payMethod: 'online',
      source: 'Referral',
      daysAgo: 9,
      prodIdx: 5,
    },
  ];

  const createdOrderRefs: Array<{ orderId: number; productId: number; variantId: number; categoryId: number; createdAt: Date; source: string }> = [];

  for (let i = 0; i < sampleOrdersData.length; i++) {
    const oData = sampleOrdersData[i];
    const prod = insertedProducts[oData.prodIdx % insertedProducts.length];
    const variant = prod.variants[0];
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - oData.daysAgo);
    createdAt.setHours(11 + (i % 8), 15, 0, 0);

    const qty = i % 3 === 0 ? 2 : 1;
    const subtotal = prod.basePrice * qty;
    const zone = oData.city === 'Dhaka' ? zones[0] : zones[2];
    const deliveryCharge = subtotal >= (zone.freeShippingThreshold || 99999) ? 0 : zone.charge;
    const totalAmount = subtotal + deliveryCharge;

    const [cust] = await db
      .insert(customers)
      .values({
        name: oData.name,
        phone: oData.phone,
        email: oData.email,
        totalOrders: 1,
        totalSpent: totalAmount,
        firstSource: oData.source,
        createdAt,
      })
      .onConflictDoNothing()
      .returning();

    const custRow =
      cust ||
      (await db.select().from(customers).where(sql`${customers.phone} = ${oData.phone}`))[0];

    const orderNumber = `QYZ-202611-${String(1001 + i)}`;
    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerId: custRow.id,
        customerName: oData.name,
        customerPhone: oData.phone,
        customerEmail: oData.email,
        deliveryAddress: oData.address,
        city: oData.city,
        area: oData.area,
        postalCode: '1212',
        deliveryInstructions: 'Please call 15 mins prior to arrival',
        deliveryZoneId: zone.id,
        subtotal,
        discountAmount: 0,
        deliveryCharge,
        totalAmount,
        paymentMethod: oData.payMethod,
        paymentStatus: oData.payStatus,
        orderStatus: oData.status,
        deliveryStatus: oData.delStatus,
        trafficSource: oData.source,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: order.id,
      productId: prod.id,
      variantId: variant.id,
      productName: prod.name,
      variantSku: variant.sku,
      variantColor: variant.color,
      variantSize: variant.size,
      unitPrice: prod.basePrice,
      discountPerUnit: 0,
      finalUnitPrice: prod.basePrice,
      quantity: qty,
      lineTotal: subtotal,
    });

    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      previousStatus: null,
      newStatus: 'Pending',
      statusType: 'order',
      note: 'Order placed by customer',
      changedByName: oData.name,
      createdAt,
    });

    if (oData.status !== 'Pending') {
      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        previousStatus: 'Pending',
        newStatus: oData.status,
        statusType: 'order',
        note: `Updated to ${oData.status} by atelier dispatch`,
        changedByAdminId: superAdminId,
        changedByName: 'Tariq Rahman',
        createdAt,
      });
    }

    await db.insert(payments).values({
      orderId: order.id,
      provider: oData.payMethod === 'cod' ? 'cod' : `${oData.payMethod}_gateway`,
      method: oData.payMethod,
      amount: totalAmount,
      currency: 'BDT',
      status: oData.payStatus,
      transactionRef: `PAY-${orderNumber}`,
      paidAt: oData.payStatus === 'paid' ? createdAt : null,
      createdAt,
    });

    await db.insert(deliveries).values({
      orderId: order.id,
      deliveryZoneId: zone.id,
      courierPartner: oData.city === 'Dhaka' ? 'QAYZ Express Dhaka' : 'Steadfast Courier',
      trackingNumber: `TRK-${1001 + i}`,
      deliveryCharge,
      deliveryStatus: oData.delStatus,
      estimatedDeliveryDate: zone.estimatedDays,
      actualDeliveryDate: oData.delStatus === 'Delivered' ? createdAt.toISOString().slice(0, 10) : '',
      createdAt,
    });

    createdOrderRefs.push({
      orderId: order.id,
      productId: prod.id,
      variantId: variant.id,
      categoryId: prod.categoryId,
      createdAt,
      source: oData.source,
    });
  }

  // 8. Abandoned Carts Demo Records
  const abandonedSeeds = [
    {
      token: 'cart_abandoned_01',
      name: 'Tanvir Ahmed',
      email: 'tanvir.a@example.com',
      phone: '01788112233',
      checkoutStarted: true,
      prodIdx: 0,
      qty: 1,
      hoursAgo: 4,
    },
    {
      token: 'cart_abandoned_02',
      name: null,
      email: null,
      phone: null,
      checkoutStarted: false,
      prodIdx: 4,
      qty: 1,
      hoursAgo: 9,
    },
    {
      token: 'cart_abandoned_03',
      name: 'Mahmudul Hasan',
      email: 'mahmud@example.com',
      phone: '01899334455',
      checkoutStarted: true,
      prodIdx: 1,
      qty: 2,
      hoursAgo: 18,
    },
    {
      token: 'cart_abandoned_04',
      name: null,
      email: null,
      phone: null,
      checkoutStarted: false,
      prodIdx: 6,
      qty: 1,
      hoursAgo: 26,
    },
  ];

  for (const ac of abandonedSeeds) {
    const prod = insertedProducts[ac.prodIdx];
    const variant = prod.variants[0];
    const ts = new Date(Date.now() - ac.hoursAgo * 3600 * 1000);
    const [c] = await db
      .insert(carts)
      .values({
        sessionToken: ac.token,
        status: 'abandoned',
        customerName: ac.name,
        customerEmail: ac.email,
        customerPhone: ac.phone,
        checkoutStarted: ac.checkoutStarted,
        lastActivityAt: ts,
        createdAt: ts,
        updatedAt: ts,
      })
      .returning();

    await db.insert(cartItems).values({
      cartId: c.id,
      productId: prod.id,
      variantId: variant.id,
      quantity: ac.qty,
      createdAt: ts,
    });
  }

  // 9. Realistic Visitor Sessions & Funnel / Behavior / Search Analytics
  const sourcesWeighted = [
    { src: 'Instagram', utmSource: 'instagram', utmMedium: 'paid_social', utmCampaign: 'eid_atelier_2026', weight: 32 },
    { src: 'Facebook', utmSource: 'facebook', utmMedium: 'cpc', utmCampaign: 'heritage_silk_launch', weight: 24 },
    { src: 'Google', utmSource: 'google', utmMedium: 'organic', utmCampaign: '', weight: 20 },
    { src: 'Direct', utmSource: '', utmMedium: '', utmCampaign: '', weight: 14 },
    { src: 'TikTok', utmSource: 'tiktok', utmMedium: 'social_video', utmCampaign: 'zari_lookbook', weight: 7 },
    { src: 'Referral', utmSource: 'dhaka_fashion_journal', utmMedium: 'referral', utmCampaign: '', weight: 3 },
  ];
  const pickSource = (idx: number) => {
    const r = (idx * 17) % 100;
    let acc = 0;
    for (const s of sourcesWeighted) {
      acc += s.weight;
      if (r < acc) return s;
    }
    return sourcesWeighted[0];
  };

  const devices = ['Mobile', 'Mobile', 'Mobile', 'Desktop', 'Desktop', 'Tablet'];
  const browsers = ['Chrome', 'Safari', 'Chrome', 'Edge', 'Firefox'];
  const osList = ['Android', 'iOS', 'Windows', 'macOS'];
  const searchQueries = [
    { q: 'jamdani panjabi', count: 14, results: 1 },
    { q: 'black silk', count: 19, results: 2 },
    { q: 'white panjabi', count: 22, results: 2 },
    { q: 'linen', count: 11, results: 1 },
    { q: 'wedding emerald', count: 8, results: 1 },
    { q: 'chikankari', count: 10, results: 2 },
    { q: 'velvet sherwani', count: 7, results: 0 }, // Zero-result search insight!
    { q: 'kids panjabi', count: 5, results: 0 }, // Zero-result search insight!
  ];

  const eventBatch: Array<typeof analyticsEvents.$inferInsert> = [];

  for (let i = 0; i < 180; i++) {
    const srcInfo = pickSource(i);
    const daysAgo = i % 21;
    const startedAt = new Date(Date.now() - daysAgo * 86400000 - (i % 12) * 3600000);
    const visitorId = `vis_${1000 + (i % 135)}`;
    const sessionToken = `sess_seed_${i}`;
    const isReturning = i >= 135;
    const durationSeconds = 45 + ((i * 37) % 420);

    const [sess] = await db
      .insert(sessions)
      .values({
        visitorId,
        sessionToken,
        isReturning,
        trafficSource: srcInfo.src,
        referrer: srcInfo.utmSource ? `https://${srcInfo.utmSource}.com` : '',
        landingPage: i % 4 === 0 ? '/products' : '/',
        utmSource: srcInfo.utmSource,
        utmMedium: srcInfo.utmMedium,
        utmCampaign: srcInfo.utmCampaign,
        deviceType: devices[i % devices.length],
        browser: browsers[i % browsers.length],
        os: osList[i % osList.length],
        country: 'Bangladesh',
        durationSeconds,
        pageViews: 2 + (i % 5),
        startedAt,
        lastSeenAt: new Date(startedAt.getTime() + durationSeconds * 1000),
      })
      .returning();

    eventBatch.push({
      sessionId: sess.id,
      sessionToken,
      visitorId,
      eventType: 'Page Viewed',
      pagePath: '/',
      createdAt: startedAt,
    });

    // ~65% view products (also skew Kabir Tussar & Zayan Indigo to have high views & lower conversion to show conversion leak insights)
    if (i % 10 < 7) {
      const pIdx = i % 5 === 0 ? 6 : i % insertedProducts.length;
      const prod = insertedProducts[pIdx];
      eventBatch.push({
        sessionId: sess.id,
        sessionToken,
        visitorId,
        eventType: 'Product Viewed',
        productId: prod.id,
        categoryId: prod.categoryId,
        dwellTimeSeconds: 28 + (i % 95),
        pagePath: `/products/${prod.id}`,
        createdAt: startedAt,
      });

      // ~28% of viewers add to cart
      if (i % 4 === 0) {
        const v = prod.variants[i % prod.variants.length];
        eventBatch.push({
          sessionId: sess.id,
          sessionToken,
          visitorId,
          eventType: 'Add To Cart',
          productId: prod.id,
          variantId: v.id,
          categoryId: prod.categoryId,
          selectedColor: v.color,
          selectedSize: v.size,
          pagePath: `/products/${prod.id}`,
          createdAt: startedAt,
        });

        // ~55% of cart adders start checkout
        if (i % 8 === 0) {
          eventBatch.push({
            sessionId: sess.id,
            sessionToken,
            visitorId,
            eventType: 'Checkout Started',
            productId: prod.id,
            variantId: v.id,
            categoryId: prod.categoryId,
            pagePath: '/checkout',
            createdAt: startedAt,
          });
        }
      }
    }
  }

  // Record purchase events linked to seeded orders
  for (const oRef of createdOrderRefs) {
    eventBatch.push({
      eventType: 'Purchase Completed',
      productId: oRef.productId,
      variantId: oRef.variantId,
      categoryId: oRef.categoryId,
      orderId: oRef.orderId,
      pagePath: '/checkout',
      createdAt: oRef.createdAt,
    });
  }

  // Record search events
  for (const sq of searchQueries) {
    for (let k = 0; k < sq.count; k++) {
      eventBatch.push({
        eventType: 'Product Search',
        searchQuery: sq.q,
        searchResultsCount: sq.results,
        pagePath: '/products',
        createdAt: new Date(Date.now() - (k % 14) * 86400000),
      });
    }
  }

  // Insert analytics events in chunks
  for (let i = 0; i < eventBatch.length; i += 100) {
    await db.insert(analyticsEvents).values(eventBatch.slice(i, i + 100));
  }

  // 10. Store Settings, Audit Logs & Notification Logs
  await db
    .insert(storeSettings)
    .values([
      {
        key: 'brand',
        value: {
          name: 'QAYZ',
          tagline: 'Modern South Asian Punjabi Atelier',
          supportEmail: 'concierge@qayz.com',
          supportPhone: '+880 1700-004500',
          address: 'Road 11, Banani, Dhaka 1213, Bangladesh',
          currency: 'BDT',
        },
        updatedByAdminId: superAdminId,
      },
      {
        key: 'notifications',
        value: {
          enableEmail: true,
          enableSms: true,
          enableWhatsapp: false,
          lowStockAlertEmail: 'inventory@qayz.com',
        },
        updatedByAdminId: superAdminId,
      },
      {
        key: 'returnPolicy',
        value: {
          daysAllowed: 7,
          summary: 'Complimentary 7-day size exchange or return on unworn garments with original tags.',
        },
        updatedByAdminId: superAdminId,
      },
    ])
    .onConflictDoNothing();

  await db.insert(auditLogs).values([
    {
      adminUserId: superAdminId,
      adminEmail: 'admin@qayz.com',
      adminRole: 'super_admin',
      action: 'Product Created',
      resource: 'product',
      resourceId: '1',
      newValue: { name: 'Zafar Obsidian Zari-Collar Silk Panjabi', basePrice: 6850 },
      ipAddress: '127.0.0.1',
      userAgent: 'QAYZ Initializer',
    },
    {
      adminUserId: superAdminId,
      adminEmail: 'admin@qayz.com',
      adminRole: 'super_admin',
      action: 'Order Status Changed',
      resource: 'order',
      resourceId: 'QYZ-202611-1001',
      previousValue: { orderStatus: 'Shipped' },
      newValue: { orderStatus: 'Delivered' },
      ipAddress: '127.0.0.1',
      userAgent: 'QAYZ Initializer',
    },
    {
      adminUserId: superAdminId,
      adminEmail: 'admin@qayz.com',
      adminRole: 'super_admin',
      action: 'Settings Updated',
      resource: 'settings',
      resourceId: 'store',
      newValue: { currency: 'BDT', returnDays: 7 },
      ipAddress: '127.0.0.1',
      userAgent: 'QAYZ Initializer',
    },
  ]);

  await db.insert(notificationLogs).values([
    {
      channel: 'sms',
      event: 'order_placed',
      recipient: '01711223344',
      subject: 'QAYZ Order Confirmed: QYZ-202611-1001',
      payload: { orderNumber: 'QYZ-202611-1001' },
      status: 'sent',
    },
    {
      channel: 'internal',
      event: 'low_stock_alert',
      recipient: 'inventory@qayz.com',
      subject: 'Low Stock Alert: Aarav Ivory Jamdani (Size XL)',
      payload: { availableStock: 0, threshold: 5 },
      status: 'queued',
    },
  ]);

  console.log('Seed completed successfully.');
}

// Allow CLI execution (`tsx src/db/seed.ts`)
if (process.argv[1]?.includes('seed')) {
  runMigrations()
    .then(() => seedDatabaseIfEmpty(false))
    .then(() => {
      console.log('CLI seed done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

