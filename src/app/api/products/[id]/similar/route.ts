import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";
import type { Product } from "@/data/products";

type SimilarProductRow = {
  id: string;
  name: string | null;
  description: string | null;
  category: string | null;
  original_price: number | null;
  discounted_price: number | null;
  stock: number | null;
  image_url: string | null;
  expiry_date: string | null;
  demand_level: "low" | "medium" | "high" | null;
  price_floor: number | null;
  created_at: string;
};

function toProduct(row: SimilarProductRow): Product {
  const originalPrice = Number(row.original_price ?? 0);
  const currentPrice = Number(row.discounted_price ?? row.original_price ?? 0);
  const stock = Math.max(0, Number(row.stock ?? 0));
  const today = new Date();
  const todayKey = [
    today.getUTCFullYear(),
    String(today.getUTCMonth() + 1).padStart(2, "0"),
    String(today.getUTCDate()).padStart(2, "0"),
  ].join("-");
  const expired = Boolean(row.expiry_date && row.expiry_date < todayKey);

  return {
    id: row.id,
    name: row.name ?? "Unnamed product",
    description: row.description ?? "",
    category: row.category as Product["category"],
    currentPrice,
    originalPrice,
    discountPercentage: originalPrice > 0
      ? Math.max(0, Math.round(((originalPrice - currentPrice) / originalPrice) * 100))
      : 0,
    image: row.image_url ?? "",
    brand: "LastCall seller",
    featured: true,
    remainingStock: stock,
    status: stock > 0 && !expired ? "active" : "sold-out",
    keywords: [],
    createdAt: row.created_at,
    expiryDate: row.expiry_date ?? undefined,
    expiry_date: row.expiry_date,
    demand_level: row.demand_level,
    price_floor: row.price_floor,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { url, anonKey } = getPublicSupabaseConfig();
    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase.rpc("find_similar_products", {
      p_product_id: id,
      p_limit: 4,
    });

    if (error) {
      console.error("Similar products search error:", error);
      return NextResponse.json({ error: "Unable to load similar products" }, { status: 500 });
    }

    const similarProducts = (data ?? []) as SimilarProductRow[];
    return NextResponse.json(similarProducts.map((row) => toProduct(row)));
  } catch (error) {
    console.error("Unexpected similar products error:", error);
    return NextResponse.json({ error: "Unable to load similar products" }, { status: 500 });
  }
}
