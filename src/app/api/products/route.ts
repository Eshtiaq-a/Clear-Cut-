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
  expiry_date: string | null;
  demand_level: "low" | "medium" | "high" | null;
  price_floor: number | null;
  created_at: string;
}): Product {
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

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category")?.trim();

  try {
    const { url, anonKey } = getPublicSupabaseConfig();
    const supabase = createClient(url, anonKey);

    let query = supabase
      .from("products")
      .select("id, name, description, category, original_price, discounted_price, stock, image_url, expiry_date, demand_level, price_floor, created_at")
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

    const today = new Date();
    const todayKey = [
      today.getUTCFullYear(),
      String(today.getUTCMonth() + 1).padStart(2, "0"),
      String(today.getUTCDate()).padStart(2, "0"),
    ].join("-");

    return NextResponse.json(
      (data ?? [])
        .filter((row) => !row.expiry_date || row.expiry_date >= todayKey)
        .map(toProduct),
    );
  } catch (error) {
    console.error("Unexpected products list error:", error);
    return NextResponse.json({ error: "Unable to load products" }, { status: 500 });
  }
}
