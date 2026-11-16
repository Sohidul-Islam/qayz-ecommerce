import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db, Database } from '../db/index.js';
import { inventory, inventoryTransactions, notificationLogs, productVariants, products } from '../db/schema.js';
import { AppError } from '../middleware/error.js';

export type InventoryReason =
  | 'Initial Stock'
  | 'Purchase/Restock'
  | 'Order'
  | 'Order Cancellation'
  | 'Return'
  | 'Manual Adjustment'
  | 'Damaged';

type DbOrTx = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

export function calculateDiscountedUnitPrice(
  basePrice: number,
  discountType: string,
  discountValue: number,
  priceOverride?: number | null
): { unitPrice: number; discountPerUnit: number; finalUnitPrice: number } {
  const unitPrice = priceOverride && priceOverride > 0 ? priceOverride : basePrice;
  let discountPerUnit = 0;

  if (discountType === 'percentage' && discountValue > 0) {
    const clampedPct = Math.min(100, Math.max(0, discountValue));
    discountPerUnit = Math.round((unitPrice * clampedPct) / 100);
  } else if (discountType === 'fixed' && discountValue > 0) {
    discountPerUnit = Math.min(unitPrice, discountValue);
  }

  return {
    unitPrice,
    discountPerUnit,
    finalUnitPrice: Math.max(0, unitPrice - discountPerUnit),
  };
}

/**
 * Atomically deducts stock for an order item inside a DB transaction.
 * Uses conditional SQL WHERE available_stock >= quantity to guarantee no overselling under concurrency.
 */
export async function deductStockForOrderTx(
  tx: DbOrTx,
  params: {
    variantId: number;
    quantity: number;
    orderNumber: string;
  }
): Promise<{ previousStock: number; newStock: number }> {
  const updated = await tx
    .update(inventory)
    .set({
      currentStock: sql`${inventory.currentStock} - ${params.quantity}`,
      availableStock: sql`${inventory.availableStock} - ${params.quantity}`,
      soldQuantity: sql`${inventory.soldQuantity} + ${params.quantity}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventory.variantId, params.variantId),
        gte(inventory.availableStock, params.quantity)
      )
    )
    .returning();

  if (updated.length === 0) {
    const existing = await tx
      .select({
        availableStock: inventory.availableStock,
        sku: productVariants.sku,
        color: productVariants.color,
        size: productVariants.size,
        productName: products.name,
      })
      .from(productVariants)
      .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(eq(productVariants.id, params.variantId))
      .limit(1);

    const info = existing[0];
    if (!info) {
      throw new AppError(404, `Product variant #${params.variantId} not found`, 'VARIANT_NOT_FOUND');
    }

    throw new AppError(
      409,
      `Insufficient stock for ${info.productName} (${info.color}, Size ${info.size}). Only ${info.availableStock ?? 0} left in stock.`,
      'INSUFFICIENT_STOCK',
      {
        variantId: params.variantId,
        sku: info.sku,
        availableStock: info.availableStock ?? 0,
        requestedQuantity: params.quantity,
      }
    );
  }

  const inv = updated[0];
  const newStock = inv.currentStock;
  const previousStock = newStock + params.quantity;

  await tx.insert(inventoryTransactions).values({
    variantId: params.variantId,
    inventoryId: inv.id,
    changeAmount: -params.quantity,
    previousStock,
    newStock,
    reason: 'Order',
    referenceType: 'order',
    referenceId: params.orderNumber,
    note: `Stock deducted for order ${params.orderNumber}`,
  });

  if (inv.availableStock <= inv.lowStockThreshold) {
    await tx.insert(notificationLogs).values({
      channel: 'internal',
      event: 'low_stock_alert',
      recipient: 'inventory@qayz.com',
      subject: `Low Stock Alert: Variant #${params.variantId}`,
      payload: {
        variantId: params.variantId,
        availableStock: inv.availableStock,
        threshold: inv.lowStockThreshold,
        orderNumber: params.orderNumber,
      },
      status: 'queued',
    });
  }

  return { previousStock, newStock };
}

/**
 * Atomically restores stock on Order Cancellation or Return inside a DB transaction.
 */
export async function restoreStockForOrderTx(
  tx: DbOrTx,
  params: {
    variantId: number;
    quantity: number;
    orderNumber: string;
    reason: 'Order Cancellation' | 'Return';
    adminId?: number | null;
  }
): Promise<void> {
  const updated = await tx
    .update(inventory)
    .set({
      currentStock: sql`${inventory.currentStock} + ${params.quantity}`,
      availableStock: sql`${inventory.availableStock} + ${params.quantity}`,
      soldQuantity: sql`GREATEST(0, ${inventory.soldQuantity} - ${params.quantity})`,
      updatedAt: new Date(),
    })
    .where(eq(inventory.variantId, params.variantId))
    .returning();

  if (updated.length === 0) return;

  const inv = updated[0];
  const newStock = inv.currentStock;
  const previousStock = newStock - params.quantity;

  await tx.insert(inventoryTransactions).values({
    variantId: params.variantId,
    inventoryId: inv.id,
    changeAmount: params.quantity,
    previousStock,
    newStock,
    reason: params.reason,
    referenceType: 'order',
    referenceId: params.orderNumber,
    note: `Stock restored due to ${params.reason.toLowerCase()} (${params.orderNumber})`,
    performedByAdminId: params.adminId ?? null,
  });
}

/**
 * Admin manual inventory adjustment (Restock, Adjustment, Damaged, Return).
 */
export async function adjustInventoryByAdmin(params: {
  variantId: number;
  changeAmount?: number;
  setStock?: number;
  lowStockThreshold?: number;
  reason: InventoryReason;
  note?: string;
  adminId: number;
}) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(inventory)
      .where(eq(inventory.variantId, params.variantId))
      .limit(1);

    const currentInv = rows[0];
    if (!currentInv) {
      throw new AppError(404, 'Inventory record not found for variant', 'INVENTORY_NOT_FOUND');
    }

    const previousStock = currentInv.currentStock;
    let delta = params.changeAmount ?? 0;
    if (typeof params.setStock === 'number') {
      delta = params.setStock - previousStock;
    }

    const newStock = previousStock + delta;
    if (newStock < 0) {
      throw new AppError(400, 'Stock cannot be adjusted below zero', 'NEGATIVE_STOCK');
    }

    const newAvailable = Math.max(0, newStock - currentInv.reservedStock);
    const nextThreshold =
      typeof params.lowStockThreshold === 'number'
        ? params.lowStockThreshold
        : currentInv.lowStockThreshold;

    const [updated] = await tx
      .update(inventory)
      .set({
        currentStock: newStock,
        availableStock: newAvailable,
        lowStockThreshold: nextThreshold,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, currentInv.id))
      .returning();

    if (delta !== 0) {
      await tx.insert(inventoryTransactions).values({
        variantId: params.variantId,
        inventoryId: currentInv.id,
        changeAmount: delta,
        previousStock,
        newStock,
        reason: params.reason,
        referenceType: 'admin_adjustment',
        referenceId: String(params.adminId),
        note: params.note || `${params.reason} by admin`,
        performedByAdminId: params.adminId,
      });
    }

    return { previous: currentInv, updated };
  });
}

export async function getVariantTransactions(variantId: number) {
  return db
    .select()
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.variantId, variantId))
    .orderBy(desc(inventoryTransactions.createdAt))
    .limit(50);
}
