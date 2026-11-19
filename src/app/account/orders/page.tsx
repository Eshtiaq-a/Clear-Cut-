import Link from "next/link";
import type { Metadata } from "next";
import { MarketplaceShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Sample orders | Clear Cut",
  robots: { index: false, follow: false },
};
export default function OrdersPage() {
  return <MarketplaceShell><section className="container page-section narrow-page"><div className="page-intro"><p className="eyebrow">Account</p><h1>Your orders</h1><p>Everything you have rescued from waste.</p></div><div className="dashboard-panel"><div><BadgeLike>Delivered</BadgeLike><h2>Order LC-1048</h2><p>2 items · Delivered 18 Nov 2026</p></div><Link className="text-link" href="/account/impact">View impact →</Link></div></section></MarketplaceShell>;
}
function BadgeLike({ children }: { children: React.ReactNode }) { return <span className="status-label">{children}</span>; }
