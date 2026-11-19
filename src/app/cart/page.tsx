import { MarketplaceShell } from "@/components/page-shell";
import { CartContents } from "@/components/cart-contents";

export default function CartPage() {
  return <MarketplaceShell><section className="container page-section"><CartContents /></section></MarketplaceShell>;
}
