import { MarketplaceShell, StatCard } from "@/components/page-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sample impact | Clear Cut",
  robots: { index: false, follow: false },
};
export default function ImpactPage() {
  return <MarketplaceShell><section className="container page-section"><div className="page-intro"><p className="eyebrow">Your impact</p><h1>Shopping that adds up.</h1><p>Every Clear Cut order helps useful products stay in use.</p></div><div className="stats-grid"><StatCard label="Food & goods rescued" value="24" note="Products kept in use" /><StatCard label="Waste avoided" value="12.4kg" note="Estimated landfill diversion" /><StatCard label="Money saved" value="৳8,460" note="Compared with original prices" /></div><div className="impact-note"><span>♧</span><div><h2>Keep making thoughtful choices</h2><p>Your next basket can help a local seller recover value and keep another good product from going to waste.</p></div></div></section></MarketplaceShell>;
}
