import Link from "next/link";
import { MarketplaceShell } from "@/components/page-shell";

export default function ProductNotFound() {
  return (
    <MarketplaceShell>
      <section className="container page-section">
        <div className="empty-state product-not-found">
          <p className="eyebrow">Product unavailable</p>
          <h1>We could not find that product.</h1>
          <span>The listing may have expired or the link may be incorrect.</span>
          <Link className="button button-primary" href="/search">Browse all deals</Link>
        </div>
      </section>
    </MarketplaceShell>
  );
}
