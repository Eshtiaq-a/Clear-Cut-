"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCart, setCart, type CartItem } from "@/lib/demo-commerce";
import type { Product } from "@/data/products";

type CartContextValue = {
  items: CartItem[];
  uniqueCount: number;
  itemCount: number;
  addItem: (product: Product, quantity?: number) => Promise<boolean>;
  cartError: string;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartError, setCartError] = useState("");

  useEffect(() => {
    const syncCart = () => setItems(getCart());
    const initialSync = window.setTimeout(syncCart, 0);
    window.addEventListener("lastcall-cart-updated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.clearTimeout(initialSync);
      window.removeEventListener("lastcall-cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadServerCart() {
      try {
        const response = await fetch("/api/cart");
        if (!response.ok) return;
        const rows = await response.json() as Array<{
          id: string;
          product_id: string;
          quantity: number;
          products: {
            id: string;
            name: string;
            description: string;
            category: Product["category"];
            original_price: number;
            discounted_price: number;
            stock: number;
            image_url: string;
            created_at: string;
          };
        }>;
        if (!active) return;
        const serverItems: CartItem[] = rows.flatMap((row) => {
          const source = row.products;
          if (!source) return [];
          const originalPrice = Number(source.original_price ?? 0);
          const currentPrice = Number(source.discounted_price ?? source.original_price ?? 0);
          const stock = Number(source.stock ?? 0);
          return [{
            id: source.id,
            cartItemId: row.id,
            quantity: Number(row.quantity),
            product: {
              id: source.id,
              name: source.name ?? "Unnamed product",
              description: source.description ?? "",
              category: source.category,
              originalPrice,
              currentPrice,
              discountPercentage: originalPrice > 0
                ? Math.max(0, Math.round(((originalPrice - currentPrice) / originalPrice) * 100))
                : 0,
              image: source.image_url ?? "",
              brand: "LastCall seller",
              featured: true,
              remainingStock: stock,
              status: stock > 0 ? "active" : "sold-out",
              keywords: [],
              createdAt: source.created_at,
            },
          }];
        });
        setItems(serverItems);
        setCart(serverItems);
      } catch (error) {
        console.error("Cart API load error:", error);
      }
    }
    loadServerCart();
    return () => { active = false; };
  }, []);

  function commit(next: CartItem[]) {
    setItems(next);
    setCart(next);
  }

  async function addItem(product: Product, quantity = 1): Promise<boolean> {
    setCartError("");
    try {
      if (!product.id || product.status === "sold-out" || product.remainingStock <= 0) {
        throw new Error("This product is unavailable.");
      }
      const safeQuantity = Math.max(1, Math.min(product.remainingStock, Math.floor(quantity)));
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, quantity: safeQuantity }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Unable to add this product to the cart.");
      }
      const serverItem = await response.json() as { id: string };
      const latest = getCart();
      const existing = latest.find((item) => item.id === product.id);
      const nextQuantity = existing
        ? Math.min(product.remainingStock, existing.quantity + safeQuantity)
        : safeQuantity;
      commit(existing
        ? latest.map((item) => item.id === product.id ? { ...item, cartItemId: serverItem.id, quantity: nextQuantity, product } : item)
        : [...latest, { id: product.id, cartItemId: serverItem.id, quantity: safeQuantity, product }]);
      return true;
    } catch (error) {
      console.error("Add to cart error:", error);
      setCartError(error instanceof Error ? error.message : "Unable to add this product to the cart.");
      return false;
    }
  }

  async function updateQuantity(id: string, quantity: number): Promise<void> {
    try {
      const current = getCart().find((item) => item.id === id);
      if (!current?.product) throw new Error("This product is no longer available.");
      const safeQuantity = Math.max(1, Math.min(current.product.remainingStock, Math.floor(quantity)));
      if (current.cartItemId) {
        const response = await fetch(`/api/cart/${current.cartItemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: safeQuantity }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || "Unable to update the cart.");
        }
      }
      commit(getCart().map((item) => item.id === id ? { ...item, quantity: safeQuantity } : item));
    } catch (error) {
      console.error("Update cart quantity error:", error);
      setCartError(error instanceof Error ? error.message : "Unable to update the cart.");
    }
  }

  async function removeItem(id: string): Promise<void> {
    try {
      const current = getCart().find((item) => item.id === id);
      if (current?.cartItemId) {
        const response = await fetch(`/api/cart/${current.cartItemId}`, { method: "DELETE" });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || "Unable to remove the cart item.");
        }
      }
      commit(getCart().filter((item) => item.id !== id));
    } catch (error) {
      console.error("Remove cart item error:", error);
      setCartError(error instanceof Error ? error.message : "Unable to remove the cart item.");
    }
  }

  function clearCart() {
    commit([]);
  }

  const value = {
    items,
    uniqueCount: items.length,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    addItem,
    cartError,
    updateQuantity,
    removeItem,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
