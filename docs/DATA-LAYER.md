# LastCall Product Data Layer

## Purpose

The data layer provides a frontend-ready product catalog that can later be replaced by a Supabase database or API. The UI should import data utilities rather than reading the seed array directly.

## Product Structure

Products are defined by `Product` in `src/data/products.ts`.

Required fields:

- `id`
- `name`
- `description`
- `category`
- `currentPrice`
- `originalPrice`
- `discountPercentage`
- `image`
- `brand`
- `featured`
- `remainingStock`
- `status`

Optional fields:

- `nameBn`
- `descriptionBn`
- `dealUrl`
- `expiryDate`

Prices are numeric BDT values. UI code should use `productRepository.formatPrice()` for display.

## Categories

The initial category union is:

- Groceries
- Fashion
- Beauty
- Electronics
- Home
- Health

Additional categories can be added to `ProductCategory` and the seed dataset as the application grows.

## Seed Dataset

`src/data/seed-products.ts` contains at least 12 realistic products across six categories.

The seed dataset is read-only and should not be mutated by frontend components.

## Data Access

`src/lib/products.ts` exports `productRepository`, implementing `ProductRepository`.

Available operations:

- `getProducts(filters)`
- `getProductById(id)`
- `getFeaturedProducts(limit)`
- `getProductsByCategory(category)`
- `searchProducts(query)`
- `formatPrice(price)`

Supported filters include search query, category, featured status, and sorting by featured status, discount, price, or expiry date.

## Frontend Integration

Frontend components should use:

```tsx
import { productRepository } from "@/lib/products";

const products = productRepository.getProducts({
  category: "Groceries",
  sortBy: "discount",
});
```

The repository interface allows the seed implementation to be replaced by a database or API implementation without changing frontend components.

## Not Included

This phase does not implement authentication, scraping, external APIs, database infrastructure, or checkout behavior.
