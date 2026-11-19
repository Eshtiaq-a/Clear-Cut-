import type { Product } from "@/data/products";

export function ProductSpecifications({ product }: { product: Product }) {
  const rows = [
    { label: "Brand", value: product.brand },
    { label: "Category", value: product.category },
    product.condition ? { label: "Condition", value: product.condition } : null,
    ...(product.specifications ?? []).map((item) => ({ label: item.label, value: item.value })),
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  return (
    <section className="product-specifications" aria-labelledby="specifications-heading">
      <h2 id="specifications-heading">Product details</h2>
      <dl>{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
    </section>
  );
}
