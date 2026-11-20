import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("products")
      .select("id, seller_id, name, description, category, original_price, discounted_price, stock, image_url, expiry_date, demand_level, price_floor, created_at")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Seller products fetch error:", error);
      return NextResponse.json({ error: "Unable to load seller products" }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Unexpected seller products fetch error:", error);
    return NextResponse.json({ error: "Unable to load seller products" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_seller")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Seller profile fetch error:", profileError);
      return NextResponse.json({ error: "Unable to verify seller profile" }, { status: 500 });
    }

    if (!profile?.is_seller) {
      return NextResponse.json({ error: "Become a seller before creating products" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      original_price,
      discounted_price,
      stock,
      image_url,
      expiry_date,
      demand_level,
      price_floor,
    } = body;

    if (
      !name?.trim()
      || !description?.trim()
      || !category?.trim()
      || !image_url?.trim()
      || original_price === undefined
      || original_price === null
      || discounted_price === undefined
      || discounted_price === null
      || stock === undefined
      || stock === null
    ) {
      return NextResponse.json({ error: "Name, description, category, prices, stock, and image URL are required" }, { status: 400 });
    }

    const originalPrice = Number(original_price);
    const discountedPrice = Number(discounted_price);
    const stockValue = Number(stock);
    const priceFloor = price_floor === "" || price_floor === undefined || price_floor === null
      ? null
      : Number(price_floor);
    const demandLevel = ["low", "medium", "high"].includes(demand_level)
      ? demand_level
      : "medium";

    if (
      !Number.isFinite(originalPrice)
      || !Number.isFinite(discountedPrice)
      || !Number.isInteger(stockValue)
      || originalPrice <= 0
      || discountedPrice < 0
      || discountedPrice > originalPrice
      || stockValue < 0
      || (priceFloor !== null && (!Number.isFinite(priceFloor) || priceFloor < 0))
    ) {
      return NextResponse.json({ error: "Enter valid prices and a non-negative whole-number stock" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        seller_id: user.id,
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        original_price: originalPrice,
        discounted_price: discountedPrice,
        stock: stockValue,
        image_url: image_url.trim(),
        expiry_date: expiry_date || null,
        demand_level: demandLevel,
        price_floor: priceFloor,
      })
      .select("id, seller_id, name, description, category, original_price, discounted_price, stock, image_url, expiry_date, demand_level, price_floor, created_at")
      .single();

    if (error) {
      console.error("Seller product create error:", error);
      return NextResponse.json({ error: "Unable to create product" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected seller product create error:", error);
    return NextResponse.json({ error: "Unable to create product" }, { status: 500 });
  }
}
