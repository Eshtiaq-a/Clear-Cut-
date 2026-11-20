import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: orderId, error: checkoutError } = await supabase
      .rpc("place_cod_order");

    if (checkoutError) {
      console.error("Checkout RPC error:", checkoutError);
      const message = checkoutError.message || "Unable to place order";
      if (/unauthorized/i.test(message)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!orderId) {
      return NextResponse.json({ error: "Unable to place order" }, { status: 500 });
    }

    return NextResponse.json({ id: orderId }, { status: 201 });
  } catch (error) {
    console.error("Unexpected checkout error:", error);
    return NextResponse.json({ error: "Unable to place order" }, { status: 500 });
  }
}
