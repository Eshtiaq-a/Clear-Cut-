import Link from "next/link";
import type { Product } from "@/data/products";
import { marketplaceCategories } from "@/data/categories";

export function ProductBreadcrumbs({ product }: { product: Product }) {
  const category = marketplaceCategories.find((item) => item.name === product.category);
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li><Link href="/">Home</Link></li>
        {category && <li><Link href={`/category/${category.slug}`}>{product.category}</Link></li>}
        <li aria-current="page"><span>{product.name}</span></li>
      </ol>
    </nav>
  );
}
