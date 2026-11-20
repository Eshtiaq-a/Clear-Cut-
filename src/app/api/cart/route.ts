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
      .from("cart_items")
      .select(`
        id,
        product_id,
        quantity,
        products (
          id,
          name,
          description,
          category,
          original_price,
          discounted_price,
          stock,
          image_url,
          created_at
        )
      `)
      .eq("user_id", user.id);

    if (error) {
      console.error("Cart fetch error:", error);
      return NextResponse.json({ error: "Unable to load cart" }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Unexpected cart fetch error:", error);
    return NextResponse.json({ error: "Unable to load cart" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const productId = typeof body.product_id === "string" ? body.product_id : "";
    const quantity = Number(body.quantity);

    if (!productId || !Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Valid product_id and quantity are required" }, { status: 400 });
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, stock")
      .eq("id", productId)
      .maybeSingle();

    if (productError) {
      console.error("Cart product lookup error:", productError);
      return NextResponse.json({ error: "Unable to add cart item" }, { status: 500 });
    }
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (Number(product.stock) < quantity) {
      return NextResponse.json({ error: "Requested quantity exceeds available stock" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    const nextQuantity = existing
      ? Number(existing.quantity) + quantity
      : quantity;

    if (nextQuantity > Number(product.stock)) {
      return NextResponse.json({ error: "Requested quantity exceeds available stock" }, { status: 400 });
    }

    const { data, error } = existing
      ? await supabase
          .from("cart_items")
          .update({ quantity: nextQuantity })
          .eq("id", existing.id)
          .eq("user_id", user.id)
          .select("id, product_id, quantity")
          .single()
      : await supabase
          .from("cart_items")
          .insert({ user_id: user.id, product_id: productId, quantity })
          .select("id, product_id, quantity")
          .single();

    if (error) {
      console.error("Cart item upsert error:", error);
      return NextResponse.json({ error: "Unable to add cart item" }, { status: 500 });
    }

    return NextResponse.json(data, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("Unexpected cart add error:", error);
    return NextResponse.json({ error: "Unable to add cart item" }, { status: 500 });
  }
}
