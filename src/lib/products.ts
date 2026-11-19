import { seedProducts } from "@/data/seed-products";
import type {
  Product,
  ProductFilters,
  ProductCategory,
} from "@/data/products";

export interface ProductRepository {
  getProducts(filters?: ProductFilters): readonly Product[];
  getProductById(id: string): Product | undefined;
  getFeaturedProducts(limit?: number): readonly Product[];
  getProductsByCategory(category: ProductCategory): readonly Product[];
  searchProducts(query: string): readonly Product[];
  formatPrice(price: number): string;
  calculateDiscountPercentage(product: Product): number;
  calculateSavings(product: Product): number;
}

export function calculateDiscountPercentage(product: Product): number {
  if (product.originalPrice <= 0) return 0;
  return Math.max(0, Math.round(((product.originalPrice - product.currentPrice) / product.originalPrice) * 100));
}

export function calculateSavings(product: Product): number {
  return Math.max(0, product.originalPrice - product.currentPrice);
}

const normalize = (value: string): string =>
  value.trim().toLocaleLowerCase("en-BD");

function sortProducts(
  products: readonly Product[],
  sortBy: ProductFilters["sortBy"],
): readonly Product[] {
  const sorted = [...products];

  switch (sortBy) {
    case "discount":
      return sorted.sort(
        (left, right) =>
          calculateDiscountPercentage(right) - calculateDiscountPercentage(left),
      );
    case "price-low":
      return sorted.sort(
        (left, right) => left.currentPrice - right.currentPrice,
      );
    case "price-high":
      return sorted.sort(
        (left, right) => right.currentPrice - left.currentPrice,
      );
    case "expiry":
      return sorted.sort((left, right) => {
        if (!left.expiryDate) return 1;
        if (!right.expiryDate) return -1;
        return left.expiryDate.localeCompare(right.expiryDate);
      });
    case "newest":
      return sorted.sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      );
    case "recommended":
    case "featured":
    default:
      return sorted.sort(
        (left, right) =>
          Number(right.featured) - Number(left.featured),
      );
  }
}

export const productRepository: ProductRepository = {
  getProducts(filters = {}) {
    let products = [...seedProducts];

    if (filters.category && filters.category !== "All") {
      products = products.filter(
        (product) => product.category === filters.category,
      );
    }

    if (typeof filters.featured === "boolean") {
      products = products.filter(
        (product) => product.featured === filters.featured,
      );
    }

    if (typeof filters.minPrice === "number") {
      products = products.filter(
        (product) => product.currentPrice >= filters.minPrice!,
      );
    }
    if (typeof filters.maxPrice === "number") {
      products = products.filter(
        (product) => product.currentPrice <= filters.maxPrice!,
      );
    }
    if (typeof filters.minDiscount === "number") {
      products = products.filter(
        (product) => calculateDiscountPercentage(product) >= filters.minDiscount!,
      );
    }
    if (filters.availability && filters.availability !== "all") {
      products = products.filter((product) =>
        filters.availability === "sold-out"
          ? product.status === "sold-out"
          : product.status === "active" && product.remainingStock > 0,
      );
    }

    if (filters.query?.trim()) {
      const query = normalize(filters.query);
      products = products.filter((product) =>
        normalize(
          [
            product.name,
            product.nameBn ?? "",
            product.description,
            product.descriptionBn ?? "",
            product.brand,
            product.category,
            product.keywords.join(" "),
          ].join(" "),
        ).includes(query),
      );
    }

    return sortProducts(products, filters.sortBy);
  },

  getProductById(id: string) {
    return seedProducts.find((product) => product.id === id);
  },

  getFeaturedProducts(limit = 6) {
    return seedProducts
      .filter((product) => product.featured)
      .slice(0, Math.max(0, limit));
  },

  getProductsByCategory(category: ProductCategory) {
    return seedProducts.filter((product) => product.category === category);
  },

  searchProducts(query: string) {
    return this.getProducts({ query });
  },

  formatPrice(price: number) {
    return new Intl.NumberFormat("bn-BD", {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 0,
    }).format(price);
  },
  calculateDiscountPercentage,
  calculateSavings,
};
