# LastCall architecture and design system

## 1. Information architecture

LastCall has two product surfaces that share identity, catalog, orders, and impact data:

- **Marketplace:** Discover, search, filter, inspect, save, and purchase clearance products.
- **Seller workspace:** Onboard, publish inventory, manage expiry-led pricing, fulfill orders, and measure impact.

Supporting areas are account, checkout, help, and localized content. The customer experience is the default entry point; seller tools are available from the account menu and `/seller`.

## 2. Page hierarchy

```text
/
├── /search
├── /category/[category]
├── /product/[id]
├── /wishlist
├── /cart
├── /checkout
├── /account
│   ├── /orders
│   ├── /impact
│   └── /settings
└── /seller
    ├── /products
    ├── /orders
    ├── /pricing
    └── /impact
```

The hackathon demo should implement `/`, `/search`, `/product/[id]`, `/cart`, and a representative `/seller` dashboard before authentication and payment integration.

## 3. Navigation structure

The global header contains the LastCall mark, search, category access, language/currency control, wishlist, cart, and account entry. Desktop uses a compact two-row header; mobile collapses search and utility actions into a bottom sheet/drawer pattern.

Seller navigation is a contextual sidebar: Overview, Inventory, Orders, Pricing rules, and Impact. It should never compete with the customer marketplace navigation.

## 4. Reusable component system

Components live under `src/components` and are organized by responsibility:

- `ui`: Button, Badge, Card, Input, Select, EmptyState, StatusPill
- `layout`: SiteHeader, SectionHeading, Container, SellerSidebar
- `marketplace`: ProductCard, ProductGrid, CategoryRail, FilterBar, ImpactBanner
- `commerce`: PriceBreakdown, QuantitySelector, CartLine, CheckoutSteps

Components consume semantic tokens from `globals.css`, never page-specific colors. Product and seller features consume repository interfaces rather than the seed array.

## 5. Color palette and typography

- **Ink `#17332F`:** primary text and trust.
- **Forest `#0E5C4E`:** primary actions and brand.
- **Mint `#DDF4EA`:** soft surfaces and sustainability.
- **Lime `#B8E986`:** positive impact and savings accents.
- **Coral `#E76F51`:** expiry urgency and destructive states.
- **Sand `#F7F5EF`:** warm application background.
- **Cloud `#FFFFFF`:** cards and elevated surfaces.

`Geist` is the UI typeface: expressive weight and tight tracking for display copy, readable regular text for product information. Bangla content should use the system fallback until a production Bangla font is selected and performance-tested.

## 6. Responsive layout strategy

Use a mobile-first single-column flow with a 12-column desktop grid:

- `< 640px`: one column, horizontal category rail, sticky cart action where relevant.
- `640–1023px`: two-column product grid and condensed header.
- `≥ 1024px`: four-column product grid, max-width 1200px content container, persistent seller sidebar.

Touch targets are at least 44px. Product imagery remains a consistent 4:3 crop. Avoid hover-only information; expiry and discount are always visible.

## 7. Product card design

Each card has a warm image well, featured/sold-out state, discount badge, product name and brand, current/original prices, stock signal, and expiry signal. Discount percentage is computed from the product’s data and shown as a savings cue rather than a flashing sale sticker. Expiry language is explicit (`Best before 23 Nov`) and uses coral only for urgency.

## 8. Customer dashboard

The customer account prioritizes active orders, saved products, reorder shortcuts, and impact totals. The impact view translates purchases into food rescued, packaging diverted, and money saved with plain-language explanations.

## 9. Seller dashboard

The seller workspace prioritizes inventory health: stock at risk, products expiring soon, sell-through, revenue recovered, and impact. Pricing rules should be explainable (`7 days left → 20% off`, `2 days left → 40% off`) and require confirmation before publishing.

## 10. Core data entities

`User`, `SellerProfile`, `Product`, `ProductImage`, `InventoryLot`, `PriceRule`, `WishlistItem`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment`, `Address`, `ImpactEvent`, `Category`, `Notification`, and `AssistantConversation`.

`Product` is the catalog identity; `InventoryLot` owns expiry date, quantity, and lot-specific pricing. This prevents a single product record from losing traceability when sellers have multiple lots.

## 11. Hackathon build order

1. Establish tokens, shared components, and the marketplace shell.
2. Connect the existing repository to home, category/search, and product detail views.
3. Add client-side wishlist and cart state with a clear checkout summary.
4. Add a seller overview using the same product and inventory contracts.
5. Add a lightweight AI assistant grounded in catalog data and an impact summary.
6. Defer real authentication, payment capture, external AI, database migrations, and seller payouts until the demo flow is validated.

