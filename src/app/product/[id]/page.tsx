"use client";

import { use, useEffect, useState } from "react";
import { MarketplaceShell } from "@/components/page-shell";
import { ProductDetail } from "@/components/product-detail";
import type { Product } from "@/data/products";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      try {
        const response = await fetch(`/api/products/${id}`);
        if (response.status === 404) {
          if (active) setError("Product not found");
          return;
        }
        if (!response.ok) {
          throw new Error("Unable to load product");
        }

        const data = await response.json() as Product;
        if (!active) return;
        setProduct(data);

        try {
          const categoryResponse = await fetch(
            `/api/products?category=${encodeURIComponent(data.category)}`,
          );
          if (categoryResponse.ok) {
            const categoryProducts = await categoryResponse.json() as Product[];
            if (active) {
              setRelated(categoryProducts.filter((item) => item.id !== data.id).slice(0, 4));
            }
          }
        } catch (caughtError) {
          console.error("Related products fetch error:", caughtError);
        }
      } catch (caughtError) {
        console.error("Product detail fetch error:", caughtError);
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load product",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadProduct();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <MarketplaceShell>
      {isLoading ? (
        <section className="container page-section"><div className="empty-state"><strong>Loading product...</strong></div></section>
      ) : error ? (
        <section className="container page-section"><div className="empty-state" role="alert"><strong>Product unavailable</strong><span>{error}</span></div></section>
      ) : product ? (
        <ProductDetail product={product} related={related} />
      ) : null}
    </MarketplaceShell>
  );
}
