"use client";

import { useEffect, useState } from "react";
import { getWishlist, setWishlist } from "@/lib/demo-commerce";
import { productRepository } from "@/lib/products";
import { ProductCard } from "./marketplace";

export function WishlistContents() {
  const [ids, setIds] = useState<string[]>(getWishlist);

  useEffect(() => {
    const syncWishlist = () => setIds(getWishlist());
    window.addEventListener("lastcall-wishlist-updated", syncWishlist);
    window.addEventListener("storage", syncWishlist);
    return () => {
      window.removeEventListener("lastcall-wishlist-updated", syncWishlist);
      window.removeEventListener("storage", syncWishlist);
    };
  }, []);

  function clearWishlist() {
    setWishlist([]);
    setIds([]);
  }

  const products = ids.flatMap((id) => {
    const product = productRepository.getProductById(id);
    return product ? [product] : [];
  });
  if (!products.length) return <div className="empty-state"><strong>No saved products yet</strong><span>Open a product and save it for later.</span></div>;
  function removeProduct(id: string) {
    const next = ids.filter((item) => item !== id);
    setWishlist(next);
    setIds(next);
  }

  return <><button className="clear-wishlist" type="button" onClick={clearWishlist}>Clear wishlist</button><div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} onWishlistChange={(saved) => { if (!saved) removeProduct(product.id); }} />)}</div></>;
}
