"use client";

import Link from "next/link";
import { useState } from "react";
import { MarketplaceShell } from "@/components/page-shell";
import { useCart } from "@/components/cart-provider";
import { productRepository } from "@/lib/products";
import { calculateCartTotals } from "@/lib/cart";

export default function CheckoutPage() {
  const [placed, setPlaced] = useState(false);
  const [orderReference, setOrderReference] = useState("");
  const { items, clearCart } = useCart();
  const totals = calculateCartTotals(items);

  function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) return;
    const randomSuffix = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();
    const reference = `CC-DEMO-${randomSuffix}`;
    setOrderReference(reference);
    setPlaced(true);
    clearCart();
  }

  return (
    <MarketplaceShell>
      <section className="container page-section narrow-page">
        <div className="page-intro"><p className="eyebrow">Checkout</p><h1>Almost yours.</h1><p>A simulated checkout experience for the Clear Cut marketplace.</p></div>
        <form className="checkout-card" onSubmit={placeOrder}>
          {placed ? (
            <>
              <p className="cart-confirmation" role="status">
                Demo order confirmed. No payment was processed.<br />
                <strong>Order reference: {orderReference}</strong>
              </p>
              <Link className="button button-primary" href="/search">Continue shopping</Link>
            </>
          ) : totals.lines.length ? (
            <>
              <label>Email address<input type="email" name="email" placeholder="you@example.com" required /></label>
              <label>Delivery address<input name="address" placeholder="House, road, area" minLength={5} required /></label>
              <label>Payment method<div className="payment-option">Cash on delivery <span>Demo payment only</span></div></label>
              <div className="checkout-summary" aria-label="Checkout totals">
                <p><span>Original total</span><b>{productRepository.formatPrice(totals.originalTotal)}</b></p>
                <p><span>Subtotal</span><b>{productRepository.formatPrice(totals.subtotal)}</b></p>
                <p><span>You save</span><b>{productRepository.formatPrice(totals.savings)}</b></p>
                <p><span>Estimated delivery</span><b>{totals.delivery === 0 ? "Free" : productRepository.formatPrice(totals.delivery)}</b></p>
                <p className="summary-total"><span>Estimated total</span><b>{productRepository.formatPrice(totals.estimatedTotal)}</b></p>
              </div>
              <button className="button button-primary" type="submit">Place demo order</button>
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
