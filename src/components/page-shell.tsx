import type { Product } from "@/data/products";
import { ProductCard, SiteFooter, SiteHeader } from "./marketplace";

export function MarketplaceShell({ children }: { children: React.ReactNode }) {
  return <><SiteHeader /><main className="page-main">{children}</main><SiteFooter /></>;
}

export function ProductGrid({ products }: { products: readonly Product[] }) {
  if (!products.length) return <div className="empty-state"><strong>No products found</strong><span>Try another search or browse all fresh finds.</span></div>;
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}

export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="page-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>;
}

export function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
