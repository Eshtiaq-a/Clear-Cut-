import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("categories")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json(
        { status: "unavailable", database: "not_connected" },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "ok",
      database: "connected",
    });
  } catch {
    return NextResponse.json(
      { status: "unavailable", database: "not_configured" },
      { status: 503 },
    );
  }
}
