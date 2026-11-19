import Link from "next/link";
import { Badge, Icon } from "@/components/ui";
import {
  CategoryRail,
  FlashDeals,
  ProductCard,
  SectionHeading,
  SellerCta,
  SiteFooter,
  SiteHeader,
  TrustBar,
} from "@/components/marketplace";
import { productRepository } from "@/lib/products";

export default function Home() {
  const featuredProducts = productRepository.getProducts({ featured: true, sortBy: "discount" });
  const flashProducts = productRepository.getProducts({ sortBy: "discount" });

  return (
    <main>
      <SiteHeader />
      <section className="hero">
        <div className="hero-content">
          <Badge tone="mint"><Icon name="leaf" size={15} /> Better for your budget. Better for the planet.</Badge>
          <h1>Good products<br /><em>deserve a last call.</em></h1>
          <p>Discover thoughtfully priced surplus and near-expiry products before they go to waste. Quality finds, fair prices, a lighter footprint.</p>
          <form className="hero-search" action="/search">
            <Icon name="search" size={20} />
            <input name="q" placeholder="What are you looking for today?" aria-label="Search the Clear Cut marketplace" />
            <button type="submit">Search</button>
          </form>
          <div className="hero-actions"><Link className="button button-primary" href="/search">Explore fresh finds <Icon name="arrow" size={17} /></Link><Link className="text-link light" href="/account/impact">See your impact <Icon name="arrow" size={16} /></Link></div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-sticker"><Icon name="leaf" size={22} /> rescued<br />not wasted</div><div className="hero-product"><div className="product-glow" /><span>−40%</span><strong>daily<br />essentials</strong></div></div>
      </section>
      <TrustBar />
      <section className="category-section container"><SectionHeading eyebrow="Browse with purpose" title="Find your next good thing" action="View all categories" /><CategoryRail /></section>
      <section className="products-section container"><SectionHeading eyebrow="Handpicked savings" title="Featured discounts" action="See all products" /><div className="product-grid">{featuredProducts.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div></section>
      <FlashDeals products={flashProducts} />
      <section className="impact-section container"><div><Badge tone="mint"><Icon name="leaf" size={15} /> The Clear Cut impact</Badge><h2>Small choices.<br /><em>Real impact.</em></h2><p>Every purchase keeps great products in use and helps sellers recover value. Your basket makes a difference.</p><Link className="text-link" href="/account/impact">See your impact <Icon name="arrow" size={16} /></Link></div><div className="impact-stats"><div><strong>12,480</strong><span>products rescued</span></div><div><strong>৳2.4m</strong><span>saved by shoppers</span></div><div><strong>8.6t</strong><span>from landfill</span></div></div></section>
      <SellerCta />
      <SiteFooter />
    </main>
  );
}
