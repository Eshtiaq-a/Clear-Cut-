import type { CartItem } from "./demo-commerce";

export const FREE_DELIVERY_THRESHOLD = 5000;
export const ESTIMATED_DELIVERY_FEE = 80;

export function calculateCartTotals(items: readonly CartItem[]) {
  const lines = items.flatMap((item) => {
    const product = item.product;
    if (!product) return [];
    return [{ product, quantity: Math.max(1, Math.floor(item.quantity)) }];
  });
  const originalTotal = lines.reduce((sum, line) => sum + line.product.originalPrice * line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.product.currentPrice * line.quantity, 0);
  const savings = Math.max(0, originalTotal - subtotal);
  const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : ESTIMATED_DELIVERY_FEE;

  return {
    lines,
    uniqueCount: lines.length,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    originalTotal,
    subtotal,
    savings,
    delivery,
    estimatedTotal: subtotal + delivery,
  };
}
