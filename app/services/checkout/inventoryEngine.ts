/**
 * inventoryEngine.ts
 * Pure, deterministic domain logic for inventory rules, stock evaluations, and cart audits.
 * Shared across client PDP and server cart/checkout reconciliation.
 *
 * MONTS BUSINESS POLICY:
 * - Limited artisanal handcrafted batches.
 * - Backorders are strictly NOT supported.
 * - Any item with currentlyNotInStock === true or quantityAvailable <= 0 is OUT_OF_STOCK.
 * - Untracked inventory (quantityAvailable === null) respects availableForSale.
 */

export interface VariantInventoryData {
  id: string;
  availableForSale: boolean;
  currentlyNotInStock?: boolean;
  quantityAvailable?: number | null;
  quantityRule?: {
    minimum: number;
    maximum?: number | null;
    increment: number;
  };
}

export type InventoryStatus =
  | { status: 'AVAILABLE'; effectiveMax: number | null; minimum: number; increment: number }
  | { status: 'LOW_STOCK'; availableQty: number; effectiveMax: number; minimum: number; increment: number }
  | { status: 'INSUFFICIENT_QUANTITY'; requestedQty: number; availableQty: number; effectiveMax: number; minimum: number; increment: number }
  | { status: 'OUT_OF_STOCK'; availableQty: 0 | null; effectiveMax: 0; minimum: number; increment: number };

export interface ClampedCartLine {
  lineId: string;
  merchandiseId: string;
  title: string;
  previousQty: number;
  newQty: number;
  availableQty: number;
}

export interface CartAuditResult {
  isCheckoutAllowed: boolean;
  hasOutOfStockItems: boolean;
  outOfStockLines: Array<{ lineId: string; merchandiseId: string; title: string }>;
  clampedLines: ClampedCartLine[];
  batchUpdateInputs: Array<{ id: string; quantity: number }>;
}

/**
 * Calculates the effective maximum orderable quantity without leaking Infinity into domain state.
 */
export function calculateEffectiveMax(
  quantityAvailable: number | null | undefined,
  ruleMaximum: number | null | undefined,
): number | null {
  const limits = [quantityAvailable, ruleMaximum].filter(
    (val): val is number => val !== null && val !== undefined,
  );
  return limits.length > 0 ? Math.min(...limits) : null;
}

/**
 * Evaluates the stock status of a variant for a requested quantity according to MONTS business rules.
 */
export function evaluateVariantStock(
  variant: Partial<VariantInventoryData> | null | undefined,
  requestedQty: number = 1,
): InventoryStatus {
  const minimum = Math.max(1, variant?.quantityRule?.minimum ?? 1);
  const increment = Math.max(1, variant?.quantityRule?.increment ?? 1);
  const ruleMaximum = variant?.quantityRule?.maximum ?? null;

  if (!variant) {
    return { status: 'OUT_OF_STOCK', availableQty: 0, effectiveMax: 0, minimum, increment };
  }

  // MONTS Policy: No backorders allowed. If currentlyNotInStock is true, item is SOLD OUT.
  if (variant.currentlyNotInStock) {
    return { status: 'OUT_OF_STOCK', availableQty: 0, effectiveMax: 0, minimum, increment };
  }

  const rawQty = variant.quantityAvailable;

  // Tracked inventory with 0 or negative stock, or explicitly not available for sale
  if (variant.availableForSale === false || (rawQty !== null && rawQty !== undefined && rawQty <= 0)) {
    return { status: 'OUT_OF_STOCK', availableQty: 0, effectiveMax: 0, minimum, increment };
  }

  const effectiveMax = calculateEffectiveMax(rawQty, ruleMaximum);

  // If inventory is tracked and requested quantity exceeds available stock
  if (rawQty !== null && rawQty !== undefined && requestedQty > rawQty) {
    return {
      status: 'INSUFFICIENT_QUANTITY',
      requestedQty,
      availableQty: rawQty,
      effectiveMax: Math.max(0, effectiveMax ?? rawQty),
      minimum,
      increment,
    };
  }

  // Low stock warning tier: 1 to 5 pieces remaining
  if (rawQty !== null && rawQty !== undefined && rawQty <= 5) {
    return {
      status: 'LOW_STOCK',
      availableQty: rawQty,
      effectiveMax: Math.max(0, effectiveMax ?? rawQty),
      minimum,
      increment,
    };
  }

  return {
    status: 'AVAILABLE',
    effectiveMax,
    minimum,
    increment,
  };
}

/**
 * Audits all cart lines against a batched inventory snapshot.
 * Determines if checkout is allowed, identifies out-of-stock items,
 * and compiles batched updates for lines exceeding available stock.
 */
export function auditCartLines(
  lines: any[],
  snapshotMap: Map<string, VariantInventoryData>,
): CartAuditResult {
  const outOfStockLines: Array<{ lineId: string; merchandiseId: string; title: string }> = [];
  const clampedLines: ClampedCartLine[] = [];
  const batchUpdateInputs: Array<{ id: string; quantity: number }> = [];

  for (const line of lines) {
    const lineId = line?.id;
    const merchandiseId = line?.merchandise?.id;
    const currentQty = line?.quantity ?? 1;
    const itemTitle = line?.merchandise?.product?.title || line?.merchandise?.title || 'Artisanal Piece';

    if (!merchandiseId) continue;

    const variantData = snapshotMap.get(merchandiseId);
    const fallbackVariant: VariantInventoryData = variantData || {
      id: merchandiseId,
      availableForSale: Boolean(line?.merchandise?.availableForSale ?? true),
      currentlyNotInStock: false,
      quantityAvailable: line?.merchandise?.quantityAvailable ?? null,
      quantityRule: { minimum: 1, maximum: null, increment: 1 },
    };

    const stock = evaluateVariantStock(fallbackVariant, currentQty);

    if (stock.status === 'OUT_OF_STOCK') {
      outOfStockLines.push({
        lineId,
        merchandiseId,
        title: itemTitle,
      });
    } else if (stock.status === 'INSUFFICIENT_QUANTITY') {
      const targetQty = stock.effectiveMax;
      clampedLines.push({
        lineId,
        merchandiseId,
        title: itemTitle,
        previousQty: currentQty,
        newQty: targetQty,
        availableQty: stock.availableQty,
      });

      if (lineId && targetQty >= 0) {
        batchUpdateInputs.push({
          id: lineId,
          quantity: targetQty,
        });
      }
    }
  }

  const hasOutOfStockItems = outOfStockLines.length > 0;
  const isCheckoutAllowed = !hasOutOfStockItems;

  return {
    isCheckoutAllowed,
    hasOutOfStockItems,
    outOfStockLines,
    clampedLines,
    batchUpdateInputs,
  };
}
