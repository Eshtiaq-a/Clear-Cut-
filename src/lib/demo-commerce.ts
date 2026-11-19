export type CartItem = { id: string; quantity: number };
import { productRepository } from "@/lib/products";

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
      const quantity = (item as { quantity?: unknown }).quantity;
      if (typeof id !== "string" || typeof quantity !== "number" || !Number.isFinite(quantity)) continue;
      const product = productRepository.getProductById(id);
      if (!product || product.status === "sold-out" || product.remainingStock <= 0) continue;
      const safeQuantity = Math.max(1, Math.min(product.remainingStock, Math.floor(quantity)));
      if (!valid.some((entry) => entry.id === id)) valid.push({ id, quantity: safeQuantity });
    }
    return valid;
  } catch {
    return [];
  }
}

export function setCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  const valid = items.flatMap((item) => {
    const product = productRepository.getProductById(item.id);
    if (!product || product.status === "sold-out" || product.remainingStock <= 0) return [];
    return [{ id: item.id, quantity: Math.max(1, Math.min(product.remainingStock, Math.floor(item.quantity))) }];
  });
  window.localStorage.setItem(CART_KEY, JSON.stringify(valid));
  window.dispatchEvent(new Event("lastcall-cart-updated"));
}

export function addToCart(id: string, quantity: number) {
  const product = productRepository.getProductById(id);
  if (!product || product.status === "sold-out" || product.remainingStock <= 0) return;
  const safeQuantity = Math.max(1, Math.min(product.remainingStock, Math.floor(quantity)));
  const cart = getCart();
  const existing = cart.find((item) => item.id === id);
  const next = existing
    ? cart.map((item) => item.id === id ? { ...item, quantity: Math.min(product.remainingStock, item.quantity + safeQuantity) } : item)
    : [...cart, { id, quantity: safeQuantity }];
  setCart(next);
}

export function getWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(WISHLIST_KEY) ?? "[]");
    return Array.isArray(value)
      ? [...new Set(value.filter((id): id is string => typeof id === "string" && Boolean(productRepository.getProductById(id))))]
      : [];
  } catch {
    return [];
  }
}

export function setWishlist(ids: string[]) {
  if (typeof window === "undefined") return;
  const valid = [...new Set(ids.filter((id) => typeof id === "string" && Boolean(productRepository.getProductById(id))))];
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
