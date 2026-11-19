import { MarketplaceShell, PageIntro } from "@/components/page-shell";
import { WishlistContents } from "@/components/wishlist-contents";

export default function WishlistPage() {
  return <MarketplaceShell><section className="container page-section"><PageIntro eyebrow="Saved for later" title="Your wishlist" description="Keep an eye on good finds before they disappear." /><WishlistContents /></section></MarketplaceShell>;
}
