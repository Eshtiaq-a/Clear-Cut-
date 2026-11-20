"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/data/products";
import { productRepository } from "@/lib/products";
import { getWishlist, recordRecentlyViewed, setWishlist } from "@/lib/demo-commerce";
import { useCart } from "./cart-provider";
import { Badge, Icon, Card } from "./ui";
import { ProductCard, SectionHeading } from "./marketplace";
import { ProductGallery } from "./product-gallery";
import { ProductBreadcrumbs } from "./product-breadcrumbs";
import { ProductSpecifications } from "./product-specifications";
import { RecentlyViewed } from "./recently-viewed";
import { computeSuggestedPrice } from "@/lib/pricing";

export function ProductDetail({ product, related = [] }: { product: Product; related?: readonly Product[] }) {
  const { addItem, cartError } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState(() => getWishlist().includes(product.id));
  const [added, setAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    recordRecentlyViewed(product.id);
  }, [product.id]);

  useEffect(() => {
    const syncWishlist = () => setSaved(getWishlist().includes(product.id));
    window.addEventListener("lastcall-wishlist-updated", syncWishlist);
    window.addEventListener("storage", syncWishlist);
    return () => {
      window.removeEventListener("lastcall-wishlist-updated", syncWishlist);
      window.removeEventListener("storage", syncWishlist);
    };
  }, [product.id]);

  const maxQuantity = product.remainingStock;
  const savings = productRepository.calculateSavings(product);
  const discountPercentage = productRepository.calculateDiscountPercentage(product);
  const expiry = product.expiryDate
    ? new Date(product.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const pricing = computeSuggestedPrice({
    original_price: product.originalPrice,
    expiry_date: product.expiry_date ?? product.expiryDate ?? null,
    demand_level: product.demand_level ?? "medium",
    stock: product.remainingStock,
    price_floor: product.price_floor ?? 0,
  });
  const expired = pricing.blocked;
  const availability = product.status === "sold-out" || maxQuantity <= 0
    ? expired ? "Expired — unavailable" : "Sold out"
    : maxQuantity <= 5
      ? `Limited stock · ${maxQuantity} available`
      : "Available";

  function toggleWishlist() {
    const wishlist = getWishlist();
    const next = saved
      ? wishlist.filter((id) => id !== product.id)
      : [...new Set([...wishlist, product.id])];
    setWishlist(next);
    setSaved(!saved);
  }

  async function handleAddToCart() {
    if (product.status === "sold-out" || maxQuantity < 1 || isAdding) return;
    setIsAdding(true);
    await addItem(product, quantity);
    setAdded(true);
    window.setTimeout(() => setIsAdding(false), 350);
  }

  function updateQuantity(value: number) {
    setQuantity(Math.max(1, Math.min(maxQuantity, value)));
    setAdded(false);
  }

  return (
    <>
      <section className="container product-detail">
        <ProductGallery product={product} />
        <div className="detail-copy">
          <Link className="back-link" href="/search">← Back to fresh finds</Link>
          <ProductBreadcrumbs product={product} />
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <div className="seller-line">
            <span className="seller-avatar">{(product.seller?.name ?? product.brand).slice(0, 2).toUpperCase()}</span>
            <span><small>Sold by</small><strong>{product.seller?.name ?? product.brand}</strong>{product.seller?.location && <small>{product.seller.location}</small>}</span>
            {product.seller?.verified && <Badge tone="mint">✓ Verified seller</Badge>}
          </div>
          <p className="detail-description">{product.description}</p>

          {product.highlights?.length ? (
            <ul className="product-highlights" aria-label="Product highlights">
              {product.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
            </ul>
          ) : null}

          <div className="detail-price">
            <strong>{productRepository.formatPrice(product.currentPrice)}</strong>
            <span>{productRepository.formatPrice(product.originalPrice)}</span>
            <Badge tone="coral">{discountPercentage}% off</Badge>
            <Badge tone="mint">Save {productRepository.formatPrice(savings)}</Badge>
          </div>

          <div className="detail-facts">
            {expiry && <span><Icon name="leaf" size={17} /> Best before {expiry}</span>}
            {!expiry && <span><Icon name="spark" size={17} /> Clearance offer</span>}
            <span className={product.status === "sold-out" || maxQuantity <= 5 ? "stock-urgent" : ""}><Icon name="bag" size={17} /> {availability}</span>
          </div>

          <div className="savings-explanation"><span>Why this price?</span><p>You save {productRepository.formatPrice(savings)} at this deal price. This helps quality surplus inventory stay in use.</p></div>
          <details className="pricing-explanation">
            <summary>Why this price?</summary>
            {pricing.blocked ? (
              <p>{pricing.blockedReason}</p>
            ) : (
              <ul>
                {pricing.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            )}
          </details>

          {!expired && product.status !== "sold-out" && maxQuantity > 0 ? (
            <div className="purchase-row">
              <div className="quantity-control" aria-label="Quantity selector">
                <button type="button" onClick={() => updateQuantity(quantity - 1)} disabled={quantity <= 1} aria-label="Decrease quantity">−</button>
                <output aria-live="polite">{quantity}</output>
                <button type="button" onClick={() => updateQuantity(quantity + 1)} disabled={quantity >= maxQuantity} aria-label="Increase quantity">+</button>
              </div>
              <button className="button button-primary detail-add" type="button" onClick={handleAddToCart} disabled={isAdding}>{added ? "Added to cart" : "Add to cart"} <Icon name="bag" size={17} /></button>
              <button className={saved ? "detail-wishlist active" : "detail-wishlist"} type="button" onClick={toggleWishlist} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={saved}><Icon name="heart" size={19} /></button>
            </div>
          ) : (
            <div className="sold-out-actions">
              <button className="button button-secondary" type="button" disabled>{expired ? "Expired — unavailable" : "Sold out"}</button>
              <button className={saved ? "detail-wishlist active" : "detail-wishlist"} type="button" onClick={toggleWishlist} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={saved}><Icon name="heart" size={19} /></button>
            </div>
          )}

          {added && <p className="cart-confirmation" role="status">Your item is in the cart. <Link href="/cart">View cart →</Link></p>}
          {cartError && <p className="auth-error" role="alert">{cartError}</p>}
          <Card className="delivery-card"><div><Icon name="bag" size={18} /></div><div><strong>Delivery availability</strong><span>Delivery details are shown at checkout</span></div></Card>
        </div>
      </section>

      <div className="container"><ProductSpecifications product={product} /></div>

      {related.length > 0 && (
        <section className="container related-products">
          <SectionHeading eyebrow="You may also like" title="Related fresh finds" action="View all" href="/search" />
          <div className="product-grid">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div>
        </section>
      )}
      <RecentlyViewed currentId={product.id} />
    </>
  );
}
