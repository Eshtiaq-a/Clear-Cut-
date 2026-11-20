import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";
import type { Product } from "@/data/products";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { url, anonKey } = getPublicSupabaseConfig();
    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, category, original_price, discounted_price, stock, image_url, expiry_date, demand_level, price_floor, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Supabase product detail error:", error);
      return NextResponse.json({ error: "Unable to load product" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const originalPrice = Number(data.original_price ?? 0);
    const currentPrice = Number(data.discounted_price ?? data.original_price ?? 0);
    const stock = Math.max(0, Number(data.stock ?? 0));
    const today = new Date();
    const todayKey = [
      today.getUTCFullYear(),
      String(today.getUTCMonth() + 1).padStart(2, "0"),
      String(today.getUTCDate()).padStart(2, "0"),
    ].join("-");
    const expired = Boolean(data.expiry_date && data.expiry_date < todayKey);
    const product: Product = {
      id: data.id,
      name: data.name ?? "Unnamed product",
      description: data.description ?? "",
      category: data.category as Product["category"],
      currentPrice,
      originalPrice,
      discountPercentage: originalPrice > 0
        ? Math.max(0, Math.round(((originalPrice - currentPrice) / originalPrice) * 100))
        : 0,
      image: data.image_url ?? "",
      brand: "LastCall seller",
      featured: true,
      remainingStock: stock,
      status: stock > 0 && !expired ? "active" : "sold-out",
      keywords: [],
      createdAt: data.created_at,
      expiryDate: data.expiry_date ?? undefined,
      expiry_date: data.expiry_date,
      demand_level: data.demand_level,
      price_floor: data.price_floor,
    };

    return NextResponse.json(product);
  } catch (error) {
    console.error("Unexpected product detail error:", error);
    return NextResponse.json({ error: "Unable to load product" }, { status: 500 });
  }
}
