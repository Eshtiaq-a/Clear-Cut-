import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MarketplaceShell } from "@/components/page-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Account | LastCall",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.full_name?.trim()
    || user.user_metadata?.full_name
    || "LastCall user";

  return (
    <MarketplaceShell>
      <section className="container page-section">
        <div className="page-intro">
          <p className="eyebrow">Your account</p>
          <h1>Welcome, {name}.</h1>
        </div>
        <div className="empty-state">
          <strong>{name}</strong>
          <span>{user.email}</span>
        </div>
      </section>
    </MarketplaceShell>
  );
}
