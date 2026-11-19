"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { marketplaceCategories } from "@/data/categories";
import type { ProductCategory } from "@/data/products";
import { productRepository } from "@/lib/products";
import { ProductGrid } from "./page-shell";

type SortOption = "recommended" | "price-low" | "price-high" | "discount" | "newest";

export function SearchResults() {
  const router = useRouter();
  const params = useSearchParams();
  const initialCategory = params.get("category") ?? "All Deals";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<SortOption>((params.get("sort") as SortOption) || "recommended");
  const [minPrice, setMinPrice] = useState(params.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") ?? "");
  const [minDiscount, setMinDiscount] = useState(params.get("discount") ?? "");
  const [availability, setAvailability] = useState<"all" | "in-stock" | "sold-out">((params.get("availability") as "all" | "in-stock" | "sold-out") || "all");

  const filters = {
    query: query.trim(),
    category: category === "All Deals" ? "All" as const : category as ProductCategory,
    sortBy,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minDiscount: minDiscount ? Number(minDiscount) : undefined,
    availability,
  };
  const products = productRepository.getProducts(filters);

  function updateUrl() {
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (category !== "All Deals") next.set("category", category);
    if (sortBy !== "recommended") next.set("sort", sortBy);
    if (minPrice) next.set("minPrice", minPrice);
    if (maxPrice) next.set("maxPrice", maxPrice);
    if (minDiscount) next.set("discount", minDiscount);
    if (availability !== "all") next.set("availability", availability);
    router.replace(next.size ? `/search?${next.toString()}` : "/search", { scroll: false });
  }

  function clearFilters() {
    setQuery("");
    setCategory("All Deals");
    setSortBy("recommended");
    setMinPrice("");
    setMaxPrice("");
    setMinDiscount("");
    setAvailability("all");
    router.replace("/search", { scroll: false });
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl();
  }

  function clearSearch() {
    setQuery("");
    const next = new URLSearchParams();
    if (category !== "All Deals") next.set("category", category);
    if (sortBy !== "recommended") next.set("sort", sortBy);
    if (minPrice) next.set("minPrice", minPrice);
    if (maxPrice) next.set("maxPrice", maxPrice);
    if (minDiscount) next.set("discount", minDiscount);
    if (availability !== "all") next.set("availability", availability);
    router.replace(next.size ? `/search?${next.toString()}` : "/search", { scroll: false });
  }

  return (
    <div className="listing-controls">
      <form className="listing-search" onSubmit={submitSearch}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, brand or category" aria-label="Search products" />
        {query && <button type="button" onClick={clearSearch} aria-label="Clear search">Clear</button>}
        <button type="submit">Search</button>
      </form>

      <div className="listing-category-scroll" aria-label="Product categories">
        {marketplaceCategories.map((item) => (
          <button className={category === item.name ? "listing-category active" : "listing-category"} type="button" key={item.name} onClick={() => setCategory(item.name)} aria-pressed={category === item.name}>{item.name}</button>
        ))}
      </div>

      <div className="filter-row listing-filter-row">
        <span><strong>{products.length}</strong> products</span>
        <div className="listing-filter-options">
          <label>Sort<select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}><option value="recommended">Recommended</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="discount">Biggest Discount</option><option value="newest">Newest</option></select></label>
          <label>Min ৳<input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="0" /></label>
          <label>Max ৳<input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Any" /></label>
          <label>Discount<select value={minDiscount} onChange={(event) => setMinDiscount(event.target.value)}><option value="">Any</option><option value="20">20%+</option><option value="30">30%+</option><option value="40">40%+</option></select></label>
          <label>Availability<select value={availability} onChange={(event) => setAvailability(event.target.value as "all" | "in-stock" | "sold-out")}><option value="all">All</option><option value="in-stock">In stock</option><option value="sold-out">Sold out</option></select></label>
        </div>
        {(query || category !== "All Deals" || sortBy !== "recommended" || minPrice || maxPrice || minDiscount || availability !== "all") && <button className="clear-filters" type="button" onClick={clearFilters}>Reset filters</button>}
      </div>
      {products.length ? <ProductGrid products={products} /> : <div className="empty-state"><strong>No products match these filters</strong><span>Try a broader search or clear your category and price filters.</span><button className="button button-primary" type="button" onClick={clearFilters}>View all deals</button></div>}
    </div>
  );
}
