"use client";

import { useState } from "react";
import { MarketplaceShell } from "@/components/page-shell";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  return <MarketplaceShell><section className="container page-section narrow-page"><div className="page-intro"><p className="eyebrow">Account</p><h1>Settings</h1><p>Manage your marketplace preferences.</p></div><div className="checkout-card"><label>Full name<input defaultValue="Asha Rahman" /></label><label>Email address<input defaultValue="asha@example.com" /></label><label>Language<div className="payment-option">English <span>Bangla coming next</span></div></label><button className="button button-primary" type="button" onClick={() => setSaved(true)}>{saved ? "Preferences saved" : "Save preferences"}</button>{saved && <p className="cart-confirmation" role="status">Your demo preferences are saved for this session.</p>}</div></section></MarketplaceShell>;
}
