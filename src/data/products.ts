export type ProductCategory =
  | "Electronics"
  | "Smartphones"
  | "Laptops & Computers"
  | "Accessories"
  | "Fashion & Clothing"
  | "Shoes"
  | "Home & Living"
  | "Kitchen & Appliances"
  | "Beauty & Personal Care"
  | "Groceries & Food"
  | "Gaming"
  | "Sports & Fitness"
  | "Books & Stationery"
  | "Furniture"
  | "Baby & Kids"
  | "Travel & Lifestyle";

export type ProductStatus = "active" | "sold-out";
export type DemandLevel = "low" | "medium" | "high";

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ProductSeller {
  name: string;
  verified: boolean;
  location?: string;
}

export interface Product {
  id: string;
  name: string;
  nameBn?: string;
  description: string;
  descriptionBn?: string;
  category: ProductCategory;
  currentPrice: number;
  originalPrice: number;
  discountPercentage: number;
  image: string;
  brand: string;
  dealUrl?: string;
  featured: boolean;
  remainingStock: number;
  expiryDate?: string;
  expiry_date?: string | null;
  demand_level?: DemandLevel | null;
  price_floor?: number | null;
  status: ProductStatus;
  keywords: readonly string[];
  createdAt: string;
  images?: readonly string[];
  highlights?: readonly string[];
  specifications?: readonly ProductSpecification[];
  condition?: string;
  seller?: ProductSeller;
}

export interface ProductFilters {
  query?: string;
  category?: ProductCategory | "All";
  featured?: boolean;
  sortBy?: "recommended" | "featured" | "discount" | "price-low" | "price-high" | "expiry" | "newest";
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  availability?: "all" | "in-stock" | "sold-out";
}
