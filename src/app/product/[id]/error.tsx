"use client";

import Link from "next/link";

export default function ProductError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container page-section">
      <div className="empty-state">
        <p className="eyebrow">Unable to load</p>
        <h1>This product could not be loaded.</h1>
        <span>Please try again or return to the marketplace.</span>
        <div className="error-actions"><button className="button button-primary" type="button" onClick={reset}>Try again</button><Link className="button button-ghost" href="/search">Browse deals</Link></div>
      </div>
    </main>
  );
}
