"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCart, setCart, type CartItem } from "@/lib/demo-commerce";
import { productRepository } from "@/lib/products";

type CartContextValue = {
  items: CartItem[];
  uniqueCount: number;
  itemCount: number;
  addItem: (id: string, quantity?: number) => boolean;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

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

  function addItem(id: string, quantity = 1) {
    const product = productRepository.getProductById(id);
    if (!product || product.status === "sold-out" || product.remainingStock <= 0) return false;
    const safeQuantity = Math.max(1, Math.min(product.remainingStock, Math.floor(quantity)));
    const latest = getCart();
    const existing = latest.find((item) => item.id === id);
    const nextQuantity = existing
      ? Math.min(product.remainingStock, existing.quantity + safeQuantity)
      : safeQuantity;
    commit(existing
      ? latest.map((item) => item.id === id ? { ...item, quantity: nextQuantity } : item)
      : [...latest, { id, quantity: nextQuantity }]);
    return true;
  }

  function updateQuantity(id: string, quantity: number) {
    const product = productRepository.getProductById(id);
    if (!product) return;
    const safeQuantity = Math.max(1, Math.min(product.remainingStock, Math.floor(quantity)));
    commit(getCart().map((item) => item.id === id ? { ...item, quantity: safeQuantity } : item));
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
