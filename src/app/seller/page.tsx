import type { Metadata } from "next";
import { MarketplaceShell, StatCard } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Seller demo | Clear Cut",
  robots: { index: false, follow: false },
};

export default function SellerPage() {
  return <MarketplaceShell><section className="container page-section"><div className="dashboard-top"><div className="page-intro"><p className="eyebrow">Seller demo</p><h1>Good morning, Asha.</h1><p>Demonstration-only inventory snapshot. No live seller privileges or operations are available.</p></div><span className="demo-status">Demo only</span></div><div className="stats-grid"><StatCard label="Revenue recovered" value="৳48,620" note="+18% this month" /><StatCard label="Products rescued" value="286" note="Across 4 categories" /><StatCard label="Stock at risk" value="12" note="Needs attention today" /></div><div className="dashboard-panel"><div><p className="eyebrow">Today’s focus</p><h2>Move 12 products before they expire</h2><p>This is sample inventory data and cannot publish prices or change stock.</p></div><span className="status-label">No actions available</span></div></section></MarketplaceShell>;
}
