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

    const body = await request.json();
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Quantity must be a positive whole number" }, { status: 400 });
    }

    const { data: item, error: itemError } = await supabase
      .from("cart_items")
      .select("id, product_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (itemError) {
      console.error("Cart item lookup error:", itemError);
      return NextResponse.json({ error: "Unable to update cart item" }, { status: 500 });
    }
    if (!item) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("stock")
      .eq("id", item.product_id)
      .maybeSingle();
    if (productError) {
      console.error("Cart stock lookup error:", productError);
      return NextResponse.json({ error: "Unable to update cart item" }, { status: 500 });
    }
    if (!product || quantity > Number(product.stock)) {
      return NextResponse.json({ error: "Requested quantity exceeds available stock" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, product_id, quantity")
      .single();
    if (error) {
      console.error("Cart quantity update error:", error);
      return NextResponse.json({ error: "Unable to update cart item" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected cart update error:", error);
    return NextResponse.json({ error: "Unable to update cart item" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("Cart item delete error:", error);
      return NextResponse.json({ error: "Unable to remove cart item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected cart delete error:", error);
    return NextResponse.json({ error: "Unable to remove cart item" }, { status: 500 });
  }
}
