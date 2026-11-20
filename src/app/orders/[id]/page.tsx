import { notFound, redirect } from "next/navigation";
import { MarketplaceShell } from "@/components/page-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const instant = false;

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      total,
      status,
      created_at,
      order_items (
        id,
        quantity,
        price,
        products (
          name,
          image_url
        )
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!order) notFound();

  const items = Array.isArray(order.order_items) ? order.order_items : [];

  return (
    <MarketplaceShell>
      <section className="container page-section narrow-page">
        <div className="page-intro">
          <p className="eyebrow">Order confirmed</p>
          <h1>Thank you for your order.</h1>
          <p>Cash on delivery — no payment was processed online.</p>
        </div>
        <div className="checkout-card">
          <p><strong>Order ID:</strong> {order.id}</p>
          <p><strong>Status:</strong> {order.status}</p>
          <p><strong>Total:</strong> ৳{Number(order.total).toLocaleString("en-BD")}</p>
          <div className="checkout-summary">
            {items.map((item) => {
              const product = Array.isArray(item.products) ? item.products[0] : item.products;
              return (
                <p key={item.id}>
                  <span>{product?.name ?? "Product"} × {item.quantity}</span>
                  <b>৳{(Number(item.price) * Number(item.quantity)).toLocaleString("en-BD")}</b>
                </p>
              );
            })}
          </div>
        </div>
      </section>
    </MarketplaceShell>
  );
}
