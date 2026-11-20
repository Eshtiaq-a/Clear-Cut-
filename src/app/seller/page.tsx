import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MarketplaceShell } from "@/components/page-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SellerWorkspace } from "@/components/seller-workspace";

export const metadata: Metadata = {
  title: "Seller workspace | LastCall",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function SellerPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_seller")
    .eq("id", user.id)
    .maybeSingle();

  const isSeller = profile?.is_seller === true;
  let initialProducts: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    original_price: number;
    discounted_price: number;
    stock: number;
    image_url: string;
  }> = [];

  if (isSeller) {
    const { data } = await supabase
      .from("products")
      .select("id, name, description, category, original_price, discounted_price, stock, image_url")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    initialProducts = data ?? [];
  }

  return (
    <MarketplaceShell>
      <SellerWorkspace isSeller={isSeller} initialProducts={initialProducts} />
    </MarketplaceShell>
  );
}
