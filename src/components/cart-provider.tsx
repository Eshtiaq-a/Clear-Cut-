"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCart, setCart, type CartItem } from "@/lib/demo-commerce";
import type { Product } from "@/data/products";

type CartContextValue = {
  items: CartItem[];
  uniqueCount: number;
  itemCount: number;
  addItem: (product: Product, quantity?: number) => boolean;
  cartError: string;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
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

  function commit(next: CartItem[]) {
    setItems(next);
    setCart(next);
  }

  function addItem(product: Product, quantity = 1) {
    setCartError("");
    try {
      if (!product.id || product.status === "sold-out" || product.remainingStock <= 0) {
        throw new Error("This product is unavailable.");
      }
      const safeQuantity = Math.max(1, Math.min(product.remainingStock, Math.floor(quantity)));
      const latest = getCart();
      const existing = latest.find((item) => item.id === product.id);
      const nextQuantity = existing
        ? Math.min(product.remainingStock, existing.quantity + safeQuantity)
        : safeQuantity;
      commit(existing
        ? latest.map((item) => item.id === product.id ? { ...item, quantity: nextQuantity, product } : item)
        : [...latest, { id: product.id, quantity: safeQuantity, product }]);
      return true;
    } catch (error) {
      console.error("Add to cart error:", error);
      setCartError(error instanceof Error ? error.message : "Unable to add this product to the cart.");
      return false;
    }
  }

  function updateQuantity(id: string, quantity: number) {
    try {
      const current = getCart().find((item) => item.id === id);
      if (!current?.product) throw new Error("This product is no longer available.");
      const safeQuantity = Math.max(1, Math.min(current.product.remainingStock, Math.floor(quantity)));
      commit(getCart().map((item) => item.id === id ? { ...item, quantity: safeQuantity } : item));
    } catch (error) {
      console.error("Update cart quantity error:", error);
      setCartError(error instanceof Error ? error.message : "Unable to update the cart.");
    }
  }

  function removeItem(id: string) {
    commit(getCart().filter((item) => item.id !== id));
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
