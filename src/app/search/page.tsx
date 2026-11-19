import { MarketplaceShell, PageIntro } from "@/components/page-shell";
import { Suspense } from "react";
import { SearchResults } from "@/components/search-results";

export default function SearchPage() {
  return <MarketplaceShell><section className="container page-section"><PageIntro eyebrow="The marketplace" title="All fresh finds" description="Quality surplus and near-expiry products, clearly priced and ready for a better ending." /><Suspense fallback={<div className="empty-state">Loading fresh finds…</div>}><SearchResults /></Suspense></section></MarketplaceShell>;
}
