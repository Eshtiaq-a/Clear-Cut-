import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ is_seller: true })
      .eq("id", user.id)
      .select("id, full_name, is_seller")
      .single();

    if (error) {
      console.error("Seller profile update error:", error);
      return NextResponse.json({ error: "Unable to update seller profile" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected seller profile update error:", error);
    return NextResponse.json({ error: "Unable to update seller profile" }, { status: 500 });
  }
}
