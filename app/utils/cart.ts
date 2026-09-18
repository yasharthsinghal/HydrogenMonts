export function getCartLines(cart: any): any[] {
  const lines = cart?.lines;

  if (Array.isArray(lines?.nodes)) return lines.nodes;
  if (Array.isArray(lines?.edges)) return lines.edges.map((edge: any) => edge.node);
  if (Array.isArray(lines)) return lines;

  return [];
}

/**
 * Hydrogen's useOptimisticCart expects a nodes-based cart connection even
 * when the Storefront API response uses edges.
 */
export function normalizeCartForOptimistic<T>(cart: T): T {
  if (!cart || typeof cart !== 'object') return cart;

  const currentCart = cart as any;
  if (Array.isArray(currentCart.lines?.nodes)) return cart;

  return {
    ...currentCart,
    lines: {
      ...(currentCart.lines && !Array.isArray(currentCart.lines)
        ? currentCart.lines
        : {}),
      nodes: getCartLines(currentCart),
    },
  } as T;
}
