import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, seller_id")
      .eq("id", id)
      .maybeSingle();

    if (productError) {
      console.error("Seller product ownership lookup error:", productError);
      return NextResponse.json({ error: "Unable to update product" }, { status: 500 });
    }

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.seller_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const update: {
      original_price?: number;
      discounted_price?: number;
      stock?: number;
    } = {};

    if (body.original_price !== undefined) {
      const originalPrice = Number(body.original_price);
      if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
        return NextResponse.json({ error: "Enter a valid original price" }, { status: 400 });
      }
      update.original_price = originalPrice;
    }

    if (body.discounted_price !== undefined) {
      const discountedPrice = Number(body.discounted_price);
      if (!Number.isFinite(discountedPrice) || discountedPrice < 0) {
        return NextResponse.json({ error: "Enter a valid discounted price" }, { status: 400 });
      }
      update.discounted_price = discountedPrice;
    }

    if (body.stock !== undefined) {
      const stock = Number(body.stock);
      if (!Number.isInteger(stock) || stock < 0) {
        return NextResponse.json({ error: "Enter a valid stock quantity" }, { status: 400 });
      }
      update.stock = stock;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No price or stock changes supplied" }, { status: 400 });
    }

    const { data: existingProduct, error: existingProductError } = await supabase
      .from("products")
      .select("original_price, discounted_price")
      .eq("id", id)
      .eq("seller_id", user.id)
      .maybeSingle();
    if (existingProductError) {
      console.error("Seller product price lookup error:", existingProductError);
      return NextResponse.json({ error: "Unable to update product" }, { status: 500 });
    }
    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const nextOriginalPrice = update.original_price ?? Number(existingProduct.original_price);
    const nextDiscountedPrice = update.discounted_price ?? Number(existingProduct.discounted_price);
    if (
      nextDiscountedPrice < 0
      || nextDiscountedPrice > nextOriginalPrice
    ) {
      return NextResponse.json({
        error: "Discounted price must be between 0 and the original price",
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("products")
      .update(update)
      .eq("id", id)
      .eq("seller_id", user.id)
      .select("id, seller_id, name, description, category, original_price, discounted_price, stock, image_url, created_at")
      .single();

    if (error) {
      console.error("Seller product update error:", error);
      return NextResponse.json({ error: "Unable to update product" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected seller product update error:", error);
    return NextResponse.json({ error: "Unable to update product" }, { status: 500 });
  }
}
