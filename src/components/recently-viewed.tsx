"use client";

import { useState } from "react";
import { getRecentlyViewed } from "@/lib/demo-commerce";
import { productRepository } from "@/lib/products";
import { ProductCard, SectionHeading } from "./marketplace";

export function RecentlyViewed({ currentId }: { currentId: string }) {
  const [ids] = useState(() => getRecentlyViewed());
  const products = ids.filter((id) => id !== currentId).flatMap((id) => {
    const product = productRepository.getProductById(id);
    return product ? [product] : [];
  }).slice(0, 4);
  if (!products.length) return null;
  return (
    <section className="container recently-viewed">
      <SectionHeading eyebrow="Your browsing" title="Recently viewed" action="View all" href="/search" />
      <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>
  );
}
