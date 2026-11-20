"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarketplaceShell } from "@/components/page-shell";
import { useCart } from "@/components/cart-provider";
import { productRepository } from "@/lib/products";
import { calculateCartTotals } from "@/lib/cart";

export default function CheckoutPage() {
  const router = useRouter();
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState("");
  const { items, clearCart } = useCart();
  const totals = calculateCartTotals(items);

  async function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) return;
    setError("");
    setIsPlacing(true);
    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Unable to place order");
      }
      const order = await response.json() as { id: string };
      if (!order.id) {
        throw new Error("The order was created but no order ID was returned");
      }
      clearCart();
      router.replace(`/orders/${order.id}`);
      router.refresh();
    } catch (caughtError) {
      console.error("Place COD order error:", caughtError);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to place order");
    } finally {
      setIsPlacing(false);
    }
  }

  return (
    <MarketplaceShell>
      <section className="container page-section narrow-page">
        <div className="page-intro"><p className="eyebrow">Checkout</p><h1>Almost yours.</h1><p>A simulated checkout experience for the Clear Cut marketplace.</p></div>
        <form className="checkout-card" onSubmit={placeOrder}>
          {totals.lines.length ? (
            <>
              <label>Payment method<div className="payment-option">Cash on delivery <span>Pay when your order arrives</span></div></label>
              <div className="checkout-summary" aria-label="Checkout totals">
                {totals.lines.map(({ product, quantity }) => (
                  <p key={product.id}>
                    <span>{product.name} × {quantity}</span>
                    <b>{productRepository.formatPrice(product.currentPrice * quantity)}</b>
                  </p>
                ))}
                <p><span>Original total</span><b>{productRepository.formatPrice(totals.originalTotal)}</b></p>
                <p><span>Subtotal</span><b>{productRepository.formatPrice(totals.subtotal)}</b></p>
                <p><span>You save</span><b>{productRepository.formatPrice(totals.savings)}</b></p>
                <p><span>Estimated delivery</span><b>{totals.delivery === 0 ? "Free" : productRepository.formatPrice(totals.delivery)}</b></p>
                <p className="summary-total"><span>Estimated total</span><b>{productRepository.formatPrice(totals.estimatedTotal)}</b></p>
              </div>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="button button-primary" type="submit" disabled={isPlacing}>
                {isPlacing ? "Placing order..." : "Place Order (Cash on Delivery)"}
              </button>
            </>
          ) : (
            <>
              <p className="cart-confirmation">Your cart is empty. Add a product before checkout.</p>
              <Link className="button button-primary" href="/search">Browse products</Link>
            </>
          )}
          <Link className="back-link" href="/cart">← Return to cart</Link>
        </form>
      </section>
    </MarketplaceShell>
  );
}
