import type { Product } from "@/data/products";

export type CartItem = { id: string; cartItemId?: string; quantity: number; product?: Product };

const CART_KEY = "lastcall-cart";
const WISHLIST_KEY = "lastcall-wishlist";
const RECENTLY_VIEWED_KEY = "lastcall-recently-viewed";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    const valid: CartItem[] = [];
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const id = (item as { id?: unknown }).id;
      const cartItemId = (item as { cartItemId?: unknown }).cartItemId;
      const quantity = (item as { quantity?: unknown }).quantity;
      if (typeof id !== "string" || typeof quantity !== "number" || !Number.isFinite(quantity)) continue;
      const product = (item as { product?: unknown }).product as Product | undefined;
      if (!product || product.status === "sold-out" || product.remainingStock <= 0) continue;
      const safeQuantity = Math.max(1, Math.min(product.remainingStock, Math.floor(quantity)));
      if (!valid.some((entry) => entry.id === id)) {
        valid.push({
          id,
          cartItemId: typeof cartItemId === "string" ? cartItemId : undefined,
          quantity: safeQuantity,
          product,
        });
      }
    }
    return valid;
  } catch {
    return [];
  }
}

export function setCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  const valid = items.flatMap((item) => {
    if (!item.product || item.product.status === "sold-out" || item.product.remainingStock <= 0) return [];
    return [{
      id: item.id,
      cartItemId: item.cartItemId,
      quantity: Math.max(1, Math.min(item.product.remainingStock, Math.floor(item.quantity))),
      product: item.product,
    }];
  });
  window.localStorage.setItem(CART_KEY, JSON.stringify(valid));
  window.dispatchEvent(new Event("lastcall-cart-updated"));
}

export function getWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(WISHLIST_KEY) ?? "[]");
    return Array.isArray(value)
      ? [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))]
      : [];
  } catch {
    return [];
  }
}

export function setWishlist(ids: string[]) {
  if (typeof window === "undefined") return;
  const valid = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
  window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(valid));
  window.dispatchEvent(new Event("lastcall-wishlist-updated"));
}

export function getRecentlyViewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(RECENTLY_VIEWED_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(id: string) {
  if (typeof window === "undefined") return;
  const next = [id, ...getRecentlyViewed().filter((item) => item !== id)].slice(0, 6);
  window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
}
