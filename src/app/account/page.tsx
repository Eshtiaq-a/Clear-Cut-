import type { Metadata } from "next";
import Link from "next/link";
import { MarketplaceShell, StatCard } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Account demo | Clear Cut",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <MarketplaceShell><section className="container page-section"><div className="page-intro"><p className="eyebrow">Demo account</p><h1>Welcome back, Asha.</h1><p>This is a frontend demonstration using sample account data. No live account or privileged operations are available.</p></div><div className="stats-grid"><StatCard label="Products rescued" value="24" note="Since joining" /><StatCard label="Money saved" value="৳8,460" note="Compared with retail" /><StatCard label="Impact score" value="86" note="You are doing great" /></div><div className="account-links"><Link href="/account/orders"><strong>Your orders</strong><span>View sample order history →</span></Link><Link href="/account/impact"><strong>Your impact</strong><span>See sample impact →</span></Link><Link href="/account/settings"><strong>Account settings</strong><span>Demo preferences →</span></Link></div></section></MarketplaceShell>;
}
