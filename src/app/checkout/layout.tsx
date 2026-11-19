import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo checkout | Clear Cut",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
