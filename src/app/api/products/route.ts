import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";
import type { Product } from "@/data/products";

function toProduct(row: {
  id: string;
  name: string | null;
  description: string | null;
  category: string | null;
  original_price: number | null;
  discounted_price: number | null;
  stock: number | null;
  image_url: string | null;
  created_at: string;
}): Product {
  const originalPrice = Number(row.original_price ?? 0);
  const currentPrice = Number(row.discounted_price ?? row.original_price ?? 0);
  const stock = Math.max(0, Number(row.stock ?? 0));

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
    status: stock > 0 ? "active" : "sold-out",
    keywords: [],
    createdAt: row.created_at,
  };
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category")?.trim();

  try {
    const { url, anonKey } = getPublicSupabaseConfig();
    const supabase = createClient(url, anonKey);

    let query = supabase
      .from("products")
      .select("id, name, description, category, original_price, discounted_price, stock, image_url, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Supabase products list error:", error);
      return NextResponse.json({ error: "Unable to load products" }, { status: 500 });
    }

    return NextResponse.json((data ?? []).map(toProduct));
  } catch (error) {
    console.error("Unexpected products list error:", error);
    return NextResponse.json({ error: "Unable to load products" }, { status: 500 });
  }
}
