import { CategoryProducts } from "@/components/category-products";

export const instant = false;

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  return <CategoryProducts category={category} />;
}
