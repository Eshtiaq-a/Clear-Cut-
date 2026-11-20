"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./cart-provider";
import { productRepository } from "@/lib/products";
import { calculateCartTotals, FREE_DELIVERY_THRESHOLD } from "@/lib/cart";

export function CartContents() {
  const { items, uniqueCount, itemCount, updateQuantity, removeItem } = useCart();
  const [feedback, setFeedback] = useState("");

  const { lines, originalTotal, subtotal, savings, delivery, estimatedTotal } = calculateCartTotals(items);

  async function handleRemove(id: string, name: string) {
    await removeItem(id);
    setFeedback(`${name} removed from your cart.`);
  }

  if (!lines.length) {
    return (
      <div className="empty-state">
        <strong>Your cart is empty</strong>
        <span>Explore fresh finds and rescue something good.</span>
        <Link className="button button-primary" href="/search">Browse products</Link>
      </div>
    );
  }

  return (
    <>
      <div className="cart-heading">
        <div>
          <p className="eyebrow">Your basket</p>
          <h2>Shopping cart</h2>
          <span>{uniqueCount} unique {uniqueCount === 1 ? "product" : "products"} · {itemCount} {itemCount === 1 ? "item" : "items"}</span>
        </div>
        <Link className="text-link" href="/search">← Continue shopping</Link>
      </div>
      {feedback && <p className="cart-feedback" role="status">{feedback}</p>}
      <div className="cart-layout">
        <div className="cart-lines">
          {lines.map(({ product, quantity }) => (
            <div className="cart-line" key={product.id}>
              <div className="cart-thumb" style={{ backgroundImage: `url(${product.image})` }} role="img" aria-label={product.name} />
              <div className="cart-line-info">
                <strong>{product.name}</strong>
                {product.brand && <span>{product.brand}</span>}
                <span className="cart-unit-price">{productRepository.formatPrice(product.currentPrice)}
                  {product.originalPrice > product.currentPrice && <del>{productRepository.formatPrice(product.originalPrice)}</del>}
                </span>
                <button className="remove-cart-item" type="button" onClick={() => handleRemove(product.id, product.name)}>Remove</button>
              </div>
              <div className="cart-quantity" aria-label={`Quantity for ${product.name}`}>
                <button type="button" onClick={() => void updateQuantity(product.id, quantity - 1)} disabled={quantity <= 1} aria-label="Decrease quantity">−</button>
                <span>{quantity}</span>
                <button type="button" onClick={() => void updateQuantity(product.id, quantity + 1)} disabled={quantity >= product.remainingStock} aria-label="Increase quantity">+</button>
              </div>
              <div className="cart-line-total">
                <small>Line subtotal</small>
                <b>{productRepository.formatPrice(product.currentPrice * quantity)}</b>
              </div>
            </div>
          ))}
        </div>
        <div className="order-summary">
          <h2>Order summary</h2>
          <p><span>Original total</span><b>{productRepository.formatPrice(originalTotal)}</b></p>
          <p><span>Subtotal</span><b>{productRepository.formatPrice(subtotal)}</b></p>
          <p className="savings-row"><span>You save</span><b>{productRepository.formatPrice(savings)}</b></p>
          <p><span>Estimated delivery</span><b>{delivery === 0 ? "Free" : productRepository.formatPrice(delivery)}</b></p>
          {subtotal > 0 && subtotal < FREE_DELIVERY_THRESHOLD && <small className="delivery-note">Add {productRepository.formatPrice(FREE_DELIVERY_THRESHOLD - subtotal)} more for free estimated delivery.</small>}
          <hr />
          <p className="summary-total"><span>Estimated total</span><b>{productRepository.formatPrice(estimatedTotal)}</b></p>
          <Link className="button button-primary" href="/checkout">Continue to checkout</Link>
        </div>
      </div>
    </>
  );
}
