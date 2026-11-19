import { notFound } from "next/navigation";
import { MarketplaceShell } from "@/components/page-shell";
import { ProductDetail } from "@/components/product-detail";
import { productRepository } from "@/lib/products";

export function generateStaticParams() {
  return productRepository.getProducts().map((product) => ({ id: product.id }));
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = productRepository.getProductById(id);
  if (!product) notFound();
  return <MarketplaceShell><ProductDetail product={product} /></MarketplaceShell>;
}
