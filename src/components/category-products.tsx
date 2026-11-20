"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MarketplaceShell, PageIntro, ProductGrid } from "@/components/page-shell";
import { categoryNameFromSlug, marketplaceCategories } from "@/data/categories";
import type { Product } from "@/data/products";

export function CategoryProducts({ category }: { category: string }) {
  const name = categoryNameFromSlug(category);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const url = name === "All Deals"
          ? "/api/products"
          : `/api/products?category=${encodeURIComponent(name)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Unable to load products");
        const data = await response.json() as Product[];
        if (active) setProducts(data);
      } catch (caughtError) {
        console.error("Category products fetch error:", caughtError);
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load products");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadProducts();
    return () => {
      active = false;
    };
  }, [name]);

  return (
    <MarketplaceShell>
      <section className="container page-section">
        <PageIntro
          eyebrow="Shop by category"
          title={name}
          description={`Browse thoughtful ${name.toLowerCase()} finds at prices that make sense.`}
        />
        <div className="listing-category-scroll category-page-links">
          {marketplaceCategories.map((item) => (
            <Link
              className={item.name === name ? "listing-category active" : "listing-category"}
              href={item.slug === "all" ? "/search" : `/category/${item.slug}`}
              key={item.name}
            >
              {item.name}
            </Link>
          ))}
        </div>
        {isLoading ? (
          <div className="empty-state"><strong>Loading products...</strong></div>
        ) : error ? (
          <div className="empty-state" role="alert"><strong>Products unavailable</strong><span>{error}</span></div>
        ) : (
          <ProductGrid products={products} />
        )}
      </section>
    </MarketplaceShell>
  );
}
