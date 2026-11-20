"use client";

import type { Product } from "@/data/products";
import { productRepository } from "@/lib/products";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getWishlist, setWishlist } from "@/lib/demo-commerce";
import { useCart } from "./cart-provider";
import { marketplaceCategories } from "@/data/categories";
import { Badge, Card, Icon } from "./ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ProductCard({ product, onWishlistChange }: { product: Product; onWishlistChange?: (saved: boolean) => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const { addItem, cartError } = useCart();
  const discountPercentage = productRepository.calculateDiscountPercentage(product);
  const [saved, setSaved] = useState(() => getWishlist().includes(product.id));
  useEffect(() => {
    const syncWishlist = () => setSaved(getWishlist().includes(product.id));
    window.addEventListener("lastcall-wishlist-updated", syncWishlist);
    window.addEventListener("storage", syncWishlist);
    return () => {
      window.removeEventListener("lastcall-wishlist-updated", syncWishlist);
      window.removeEventListener("storage", syncWishlist);
    };
  }, [product.id]);
  function toggleWishlist() {
    const wishlist = getWishlist();
    const next = saved
      ? wishlist.filter((id) => id !== product.id)
      : [...new Set([...wishlist, product.id])];
    setWishlist(next);
    setSaved(!saved);
    onWishlistChange?.(!saved);
  }

  function handleAddToCart() {
    if (isAdding || product.status === "sold-out" || product.remainingStock <= 0) return;
    setIsAdding(true);
    if (addItem(product, 1)) {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
    }
    window.setTimeout(() => setIsAdding(false), 350);
  }
  const stockLabel =
    product.status === "sold-out"
      ? "Sold out"
      : product.remainingStock <= 5
        ? `Only ${product.remainingStock} left`
        : `${product.remainingStock} available`;

  return (
    <Card className="product-card">
      <div className="product-image">
        {product.image && !imageFailed ? (
          <Image src={product.image} alt={product.name} fill sizes="(max-width: 600px) 50vw, (max-width: 900px) 25vw, 280px" onError={() => setImageFailed(true)} style={{ objectFit: "cover" }} />
        ) : (
          <div className="missing-card-image"><Icon name="leaf" size={24} /><span>Image unavailable</span></div>
        )}
        <Badge tone={product.status === "sold-out" ? "ink" : "coral"}>
          {product.status === "sold-out" ? "Sold out" : `${discountPercentage}% off`}
        </Badge>
        <button className={saved ? "icon-button image-heart active" : "icon-button image-heart"} type="button" onClick={toggleWishlist} aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name}`} aria-pressed={saved}>
          <Icon name="heart" size={18} />
        </button>
      </div>
      <div className="product-info">
        <div className="product-meta"><span>{product.brand}</span><span>{product.category}</span></div>
        <h3><Link href={`/product/${product.id}`}>{product.name}</Link></h3>
        <div className="price-row">
          <strong>{productRepository.formatPrice(product.currentPrice)}</strong>
          <span className="original-price">{productRepository.formatPrice(product.originalPrice)}</span>
        </div>
        <div className="product-foot">
          <span className={product.remainingStock <= 5 ? "stock-urgent" : ""}>{stockLabel}</span>
          {product.expiryDate && <span>Best before {new Date(product.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
        </div>
        <button className="card-add-button" type="button" onClick={handleAddToCart} disabled={isAdding || product.status === "sold-out" || product.remainingStock <= 0}>
          <Icon name="bag" size={16} />
          {added ? "Added" : product.status === "sold-out" ? "Sold out" : "Add to cart"}
        </button>
        {cartError && <p className="auth-error" role="alert">{cartError}</p>}
      </div>
    </Card>
  );
}

export function SectionHeading({ eyebrow, title, action, href = "/search" }: { eyebrow?: string; title: string; action?: string; href?: string }) {
  return (
    <div className="section-heading">
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>
      {action && <Link className="text-link" href={href}>{action}<Icon name="arrow" size={16} /></Link>}
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount } = useCart();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? "");

      if (!user) {
        setUserName("");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      setUserName(
        profile?.full_name?.trim()
          || user.user_metadata?.full_name
          || user.email?.split("@")[0]
          || "Account",
      );
    }

    loadUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Supabase logout error:", error);
      return;
    }
    setAccountMenuOpen(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/">Clear <span>Cut</span><i>.</i></Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link className={pathname === "/" ? "active" : ""} href="/">Shop</Link>
          <Link className={pathname.startsWith("/search") || pathname.startsWith("/category") ? "active" : ""} href="/search">Categories</Link>
          <Link className={pathname.startsWith("/seller") ? "active" : ""} href="/seller">Sell with us</Link>
        </nav>
        <form className="search-box" action="/search">
          <Icon name="search" size={18} />
          <input name="q" placeholder="Search fresh finds..." aria-label="Search products" />
        </form>
        <div className="header-actions">
          <Link className="header-action" href="/wishlist" aria-label="Wishlist"><Icon name="heart" /></Link>
          <Link className="header-action bag-action" href="/cart" aria-label={`Cart with ${itemCount} items`}><Icon name="bag" /><b>{itemCount}</b></Link>
          {userName ? (
            <div className="account-menu">
              <button
                className="account-menu-trigger"
                type="button"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((open) => !open)}
              >
                <span className="avatar">{userName.charAt(0).toUpperCase()}</span>
                <span className="account-name">{userName}</span>
              </button>
              {accountMenuOpen && (
                <div className="account-dropdown">
                  <span>{userEmail}</span>
                  <Link href="/account" onClick={() => setAccountMenuOpen(false)}>Account</Link>
                  <button type="button" onClick={handleLogout}>Log out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-links">
              <Link href="/login">Log in</Link>
              <Link className="auth-signup-link" href="/signup">Sign up</Link>
            </div>
          )}
        </div>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link className={pathname === "/" ? "active" : ""} href="/">Shop</Link>
        <Link className={pathname.startsWith("/search") || pathname.startsWith("/category") ? "active" : ""} href="/search">Categories</Link>
        <Link className={pathname.startsWith("/seller") ? "active" : ""} href="/seller">Sell</Link>
      </nav>
    </header>
  );
}

export function CategoryRail() {
  return (
    <div className="category-rail">
      {marketplaceCategories.map((category) => (
        <Link className="category-pill" href={category.slug === "all" ? "/search" : `/category/${category.slug}`} key={category.name}>
          <span className={`category-icon ${category.tone}`}>{category.symbol}</span>
          <span>{category.name}</span>
        </Link>
      ))}
    </div>
  );
}

export function TrustBar() {
  const items = [
    ["✓", "Verified sellers", "Every seller is reviewed"],
    ["↺", "Simple returns", "Shop with confidence"],
    ["♧", "Less waste", "Good products, rescued"],
  ];

  return (
    <section className="trust-bar container" aria-label="Why shop with Clear Cut">
      {items.map(([symbol, title, description]) => (
        <div className="trust-item" key={title}>
          <span className="trust-icon">{symbol}</span>
          <div><strong>{title}</strong><span>{description}</span></div>
        </div>
      ))}
    </section>
  );
}

export function FlashDeals({ products }: { products: readonly Product[] }) {
  return (
    <section className="flash-section">
      <div className="container">
        <div className="flash-heading">
          <div><Badge tone="coral"><Icon name="spark" size={14} /> Moving quickly</Badge><h2>Flash deals</h2><p>Great products, ready for a better ending.</p></div>
          <Link className="text-link" href="/search">Shop all deals <Icon name="arrow" size={16} /></Link>
        </div>
        <div className="product-grid flash-grid">{products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div>
      </div>
    </section>
  );
}

export function SellerCta() {
  return (
    <section className="seller-cta container">
      <div className="seller-cta-copy"><Badge tone="mint"><Icon name="spark" size={14} /> For thoughtful businesses</Badge><h2>Turn surplus into<br /><em>something good.</em></h2><p>Join sellers who are recovering value, reaching new customers, and keeping quality products in use.</p><Link className="button button-primary" href="/seller">Start selling with us <Icon name="arrow" size={17} /></Link></div>
      <div className="seller-cta-art"><div className="seller-circle circle-one" /><div className="seller-circle circle-two" /><div className="seller-card"><span>SELLER SCORE</span><strong>4.9</strong><small>Trusted by the Clear Cut community</small></div></div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer container">
      <div className="footer-brand"><Link className="brand" href="/">Clear <span>Cut</span><i>.</i></Link><p>Good products, better endings.</p></div>
      <div className="footer-links"><div><strong>Explore</strong><Link href="/search">All products</Link><Link href="/search?sort=discount">Best discounts</Link><Link href="/account/impact">Our impact</Link></div><div><strong>For sellers</strong><Link href="/seller">Sell with Clear Cut</Link><Link href="/seller">Seller guidelines</Link><Link href="/seller">Seller help</Link></div><div><strong>Help</strong><Link href="/account">Your account</Link><Link href="/account/orders">Orders & returns</Link><Link href="/account/settings">Contact us</Link></div></div>
      <div className="footer-bottom"><span>© 2026 Clear Cut · A fictional demo marketplace</span><span>English · BDT ৳</span></div>
    </footer>
  );
}
