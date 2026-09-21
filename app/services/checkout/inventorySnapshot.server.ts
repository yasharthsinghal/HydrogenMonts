/**
 * inventorySnapshot.server.ts
 * I/O Service for fetching batched product variant inventory snapshots via Shopify Storefront API.
 */

import { INVENTORY_BATCH_QUERY } from '~/graphql/StorefrontFragments';
import type { VariantInventoryData } from './inventoryEngine';
import { logger } from '~/utils/logger.server';

export type { VariantInventoryData };

export type InventorySnapshotResult =
  | { type: 'SUCCESS'; snapshot: Map<string, VariantInventoryData> }
  | { type: 'UNAVAILABLE'; reason: string };

/**
 * Fetches real-time inventory and quantity rules for a batch of variant IDs (up to 250 in a single Storefront query).
 */
export async function getInventorySnapshot(
  storefront: any,
  variantIds: string[],
): Promise<InventorySnapshotResult> {
  const uniqueIds = Array.from(new Set(variantIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return { type: 'SUCCESS', snapshot: new Map() };
  }

  try {
    const data = await storefront.query(INVENTORY_BATCH_QUERY, {
      variables: { ids: uniqueIds },
      cache: storefront.CacheNone(),
    });

    const nodes = (data?.nodes || []) as Array<VariantInventoryData | null>;
    const snapshotMap = new Map<string, VariantInventoryData>();

    for (const node of nodes) {
      if (node?.id) {
        snapshotMap.set(node.id, {
          id: node.id,
          availableForSale: Boolean(node.availableForSale),
          currentlyNotInStock: Boolean(node.currentlyNotInStock),
          quantityAvailable:
            node.quantityAvailable !== undefined && node.quantityAvailable !== null
              ? node.quantityAvailable
              : null,
          quantityRule: node.quantityRule || { minimum: 1, maximum: null, increment: 1 },
        });
      }
    }

    return { type: 'SUCCESS', snapshot: snapshotMap };
  } catch (error: any) {
    logger.warn('[InventorySnapshotService] Failed to retrieve batched inventory snapshot', {
      variantIds: uniqueIds,
      error: error?.message || error,
    });
    return {
      type: 'UNAVAILABLE',
      reason: error?.message || 'Inventory service temporarily unavailable',
    };
  }
}
