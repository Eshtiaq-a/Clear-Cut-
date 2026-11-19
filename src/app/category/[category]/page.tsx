import { MarketplaceShell, PageIntro, ProductGrid } from "@/components/page-shell";
import { productRepository } from "@/lib/products";
import { categoryNameFromSlug, marketplaceCategories } from "@/data/categories";
import type { ProductCategory } from "@/data/products";
import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return marketplaceCategories.filter((category) => category.slug !== "all").map((category) => ({ category: category.slug }));
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const name = categoryNameFromSlug(category);
  if (name === "All Deals" && category !== "all") notFound();
  const products = productRepository.getProducts({ category: name as ProductCategory, sortBy: "discount" });
  return <MarketplaceShell><section className="container page-section"><PageIntro eyebrow="Shop by category" title={name} description={`Browse thoughtful ${name.toLowerCase()} finds at prices that make sense.`} /><div className="listing-category-scroll category-page-links">{marketplaceCategories.map((item) => <Link className={item.name === name ? "listing-category active" : "listing-category"} href={item.slug === "all" ? "/search" : `/category/${item.slug}`} key={item.name}>{item.name}</Link>)}</div><ProductGrid products={products} /></section></MarketplaceShell>;
}
