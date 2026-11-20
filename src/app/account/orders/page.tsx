import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MarketplaceShell } from "@/components/page-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your orders | LastCall",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function OrdersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: orders, error } = await supabase
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
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Account orders fetch error:", error);
  }

  return (
    <MarketplaceShell>
      <section className="container page-section narrow-page">
        <div className="page-intro">
          <p className="eyebrow">Account</p>
          <h1>Your orders</h1>
          <p>Everything you have ordered from LastCall.</p>
        </div>
        {error ? (
          <div className="empty-state" role="alert"><strong>Unable to load orders</strong><span>Please try again.</span></div>
        ) : !orders?.length ? (
          <div className="empty-state"><strong>No orders yet</strong><span>Browse fresh finds and place your first order.</span><Link className="button button-primary" href="/search">Browse products</Link></div>
        ) : (
          <div className="order-history">
            {orders.map((order) => {
              const items = Array.isArray(order.order_items) ? order.order_items : [];
              return (
                <article className="order-history-card" key={order.id}>
                  <div className="order-history-heading">
                    <div>
                      <span className={`order-status order-status-${order.status}`}>{order.status}</span>
                      <h2>Order {order.id.slice(0, 8).toUpperCase()}</h2>
                    </div>
                    <div className="order-history-total">
                      <span>{new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <strong>৳{Number(order.total).toLocaleString("en-BD")}</strong>
                    </div>
                  </div>
                  <div className="order-history-items">
                    {items.map((item) => {
                      const product = Array.isArray(item.products) ? item.products[0] : item.products;
                      return (
                        <div className="order-history-item" key={item.id}>
                          {product?.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.image_url} alt={product.name ?? "Product"} />
                          ) : (
                            <div className="seller-product-placeholder" aria-hidden="true">No image</div>
                          )}
                          <div>
                            <strong>{product?.name ?? "Product"}</strong>
                            <span>Qty {item.quantity}</span>
                          </div>
                          <strong>৳{(Number(item.price) * Number(item.quantity)).toLocaleString("en-BD")}</strong>
                        </div>
                      );
                    })}
                  </div>
                  <Link className="text-link" href={`/orders/${order.id}`}>View order →</Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </MarketplaceShell>
  );
}
