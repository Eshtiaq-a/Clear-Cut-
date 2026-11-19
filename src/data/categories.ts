import type { ProductCategory } from "./products";

export const marketplaceCategories: readonly {
  name: ProductCategory | "All Deals";
  slug: string;
  symbol: string;
  tone: string;
}[] = [
  { name: "All Deals", slug: "all", symbol: "✦", tone: "category-1" },
  { name: "Electronics", slug: "electronics", symbol: "⌁", tone: "category-4" },
  { name: "Smartphones", slug: "smartphones", symbol: "▯", tone: "category-4" },
  { name: "Laptops & Computers", slug: "laptops-computers", symbol: "▣", tone: "category-4" },
  { name: "Accessories", slug: "accessories", symbol: "◉", tone: "category-2" },
  { name: "Fashion & Clothing", slug: "fashion-clothing", symbol: "◒", tone: "category-2" },
  { name: "Shoes", slug: "shoes", symbol: "◇", tone: "category-5" },
  { name: "Home & Living", slug: "home-living", symbol: "⌂", tone: "category-5" },
  { name: "Kitchen & Appliances", slug: "kitchen-appliances", symbol: "◷", tone: "category-5" },
  { name: "Beauty & Personal Care", slug: "beauty-personal-care", symbol: "✧", tone: "category-3" },
  { name: "Groceries & Food", slug: "groceries-food", symbol: "✦", tone: "category-1" },
  { name: "Gaming", slug: "gaming", symbol: "⊞", tone: "category-4" },
  { name: "Sports & Fitness", slug: "sports-fitness", symbol: "↗", tone: "category-1" },
  { name: "Books & Stationery", slug: "books-stationery", symbol: "▤", tone: "category-2" },
  { name: "Furniture", slug: "furniture", symbol: "▱", tone: "category-5" },
  { name: "Baby & Kids", slug: "baby-kids", symbol: "◎", tone: "category-3" },
  { name: "Travel & Lifestyle", slug: "travel-lifestyle", symbol: "⌖", tone: "category-2" },
];

export function categoryNameFromSlug(slug: string): ProductCategory | "All Deals" {
  return marketplaceCategories.find((category) => category.slug === slug)?.name ?? "All Deals";
}
