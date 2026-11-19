# LastCall Backend Architecture

**Document status:** Proposed architecture for Phase 3.0  
**Project:** Clear Cut / LastCall discounted-products marketplace  
**Frontend:** Next.js 16.4.6, React 19.3.0, TypeScript  
**Document date:** 2026-11-20  
**Scope:** Architecture and implementation planning only

## 1. Executive summary

The current application is a frontend prototype. It has a Next.js App Router, React client components, a seed product catalog, localStorage-backed cart/wishlist state, and frontend-only account, seller, and checkout demos.

Phase 3 should replace demo data and trusted client calculations with server-owned:

- Authentication and sessions
- User, seller, product, inventory, cart, wishlist, order, payment, and address data
- Catalog search and filtering
- Stock reservation and quantity enforcement
- Server-calculated prices, discounts, delivery, savings, and totals
- Seller authorization and inventory operations
- Auditable order state transitions
- Demo and production environment separation

The recommended baseline is a Next.js server application with PostgreSQL/Supabase, Supabase Auth, Supabase Storage, Next.js Route Handlers for application APIs, and server-side authorization combined with PostgreSQL Row-Level Security (RLS). This keeps the current frontend framework, uses one deployment surface, and allows an incremental backend migration.

## 2. Current frontend constraints

The architecture must preserve and gradually integrate with:

- App Router pages under `src/app`
- Shared `CartProvider` and product repository patterns
- Existing localStorage keys for cart, wishlist, and recently viewed products
- Product fields in `src/data/products.ts`
- Category routing under `/category/[category]`
- Product routing under `/product/[id]`
- Existing marketplace, account, wishlist, cart, seller, and checkout routes
- BDT currency formatting
- The existing approved design system

No source or API contract change is required before the backend is ready. The frontend should continue to work with seed data until repositories/API adapters are introduced.

### Security findings incorporated

The frontend security audit found no credentials, environment variables, API keys, private keys, database URLs, or secret values in the repository or Git history. It identified these frontend-only limitations:

- Account and seller areas are demonstrations, not authenticated privileged surfaces.
- Cart quantities and pricing are currently trusted in the browser.
- Delivery rules, totals, savings, and stock limits are client-controlled.
- The checkout is simulated and does not create a real order.
- Customer email/address form values are not sent or persisted.

These must become server-authoritative in Phase 3.

## 3. Recommended technology stack

### 3.1 Core stack

| Area | Recommendation | Reason |
|---|---|---|
| Web framework | Next.js App Router | Matches the existing frontend and supports Route Handlers and Server Components |
| Language | TypeScript | Matches the repository and gives shared API/domain types |
| Database | PostgreSQL through Supabase | Managed PostgreSQL, SQL migrations, RLS, Storage, Auth, and Realtime |
| Authentication | Supabase Auth | Email/password and future social/OAuth providers with JWT sessions |
| API | Next.js Route Handlers under `/api/v1` | Keeps API behavior close to the frontend and avoids a separate initial service |
| ORM/query layer | Supabase JS plus focused SQL migrations | Simple for RLS and lower complexity; add a migration-reviewed SQL schema |
| Data access | Repository/service modules | Keeps Route Handlers thin and makes future backend extraction possible |
| Validation | Zod | Runtime validation for all API request and response boundaries |
| Image storage | Supabase Storage | Fits the existing public Unsplash seed during migration, private/authenticated storage later if needed |
| Cache | PostgreSQL plus Next.js data caching | Avoid premature Redis; add Redis only if load testing requires it |
| Background jobs | Deferred to Phase 3.9 or later | Use scheduled jobs only for expiry warnings, cleanup, and notifications |
| Observability | Structured logs plus provider metrics | Add request IDs, error codes, and privacy-safe audit events |
| Deployment | Managed Next.js platform plus Supabase | Minimal operations for the prototype stage |

### 3.2 Alternative stack decision

This recommendation depends on using Supabase. The existing `docs/DATA-LAYER.md` already proposes Supabase, so it is the lowest-risk default.

Approval required before implementation:

1. Supabase as the database/auth platform, or a separate PostgreSQL/Auth provider.
2. A managed Next.js deployment target.
3. Whether background jobs run on Supabase cron, the deployment platform, or a dedicated queue.
4. Whether image uploads use public buckets or signed/private delivery.

## 4. Environments and configuration

Create separate Development, Preview, and Production environments.

Environment variables must be divided as follows:

### Public variables

- App name, public site URL, locale, currency, and public catalog configuration
- Only intentionally public values may use `NEXT_PUBLIC_*`

### Server-only variables

- Supabase service-role key
- Database connection URL
- Auth provider server secrets
- Payment provider server secrets
- Webhook signing secrets
- Storage signing credentials

No secret may use `NEXT_PUBLIC_*`.

Secret files must remain excluded by `.gitignore`, and deployment secrets must be managed by the selected hosting platform. The repository should provide `.env.example` only with non-sensitive placeholder names, never real values.

## 5. Data model

Use PostgreSQL with UUID primary keys, `BIGINT` or integer BDT amounts in whole taka, timezone-aware timestamps, soft deletion for marketplace records, and optimistic/invariant constraints.

### 5.1 Core entities

#### `profiles`

- `id` UUID, primary key, references auth subject
- `display_name`
- `email` copy only for display; auth record remains canonical
- `phone` encrypted or held in a protected table
- `locale`
- `currency`
- `avatar_url`
- `status`
- `created_at`
- `updated_at`

#### `seller_profiles`

- `id` UUID
- `owner_user_id`
- `business_name`
- `slug`
- `location`
- `verification_status`
- `verified_at`
- `payout_status`
- `created_at`
- `updated_at`

One user may own at most one active seller profile unless marketplace requirements change.

#### `addresses`

- `id` UUID
- `user_id`
- `label`
- `recipient_name`
- `phone`
- `line1`
- `line2`
- `area`
- `city`
- `postal_code`
- `country_code`
- `is_default`
- `created_at`
- `updated_at`

#### `categories`

- `id`
- `name`
- `slug`
- `parent_id`
- `sort_order`
- `is_active`

#### `products`

- `id` UUID or public product ID
- `seller_id`
- `category_id`
- `name`
- `name_bn`
- `description`
- `description_bn`
- `brand`
- `condition`
- `original_price_bdt`
- `featured`
- `status`
- `keywords`
- `created_at`
- `updated_at`
- `deleted_at`

The existing seed IDs can be retained temporarily as stable migration keys, but public database IDs must not expose implementation-sensitive data.

#### `product_images`

- `id`
- `product_id`
- `storage_path`
- `alt_text`
- `sort_order`
- `is_primary`

#### `inventory_lots`

- `id`
- `product_id`
- `seller_id`
- `expiry_date`
- `quantity_available`
- `quantity_reserved`
- `quantity_sold`
- `status`
- `cost_?` optional and restricted
- `created_at`
- `updated_at`

A quantity invariant must hold:

```text
quantity_available >= 0
quantity_reserved >= 0
quantity_sold >= 0
```

#### `price_rules`

- `id`
- `product_id`
- `lot_id`
- `name`
- `starts_at`
- `ends_at`
- `discount_percentage`
- `fixed_price_bdt`
- `priority`
- `is_active`

Current price must be computed or written transactionally by the server. It must never be accepted as a cart/checkout authority from the browser.

#### `carts`

- `id`
- `user_id`, nullable for an authenticated session cart
- `guest_key_hash`, nullable for an anonymous cart
- `status`
- `expires_at`
- `created_at`
- `updated_at`

#### `cart_items`

- `id`
- `cart_id`
- `product_id`
- `quantity`
- `created_at`
- `updated_at`

Add unique constraint `(cart_id, product_id)` and quantity constraints of `1..remaining_stock`.

Guest cart migration on login must merge duplicate product quantities safely and enforce server stock limits.

#### `wishlist_items`

- `id`
- `user_id`
- `product_id`
- `created_at`

Unique constraint `(user_id, product_id)`.

#### `orders`

- `id`
- `order_number`
- `user_id`
- `status`
- `address_snapshot`
- `original_total_bdt`
- `subtotal_bdt`
- `savings_bdt`
- `delivery_fee_bdt`
- `total_bdt`
- `currency`
- `idempotency_key`
- `placed_at`
- `cancelled_at`
- `created_at`
- `updated_at`

#### `seller_orders`

- `id`
- `order_id`
- `seller_id`
- `status`
- `seller_subtotal_bdt`
- `seller_savings_bdt`
- `seller_delivery_fee_bdt`
- `seller_total_bdt`
- `tracking_reference`
- `cancelled_at`
- `created_at`
- `updated_at`

#### `order_items`

- `id`
- `order_id`
- `seller_order_id`
- `seller_id`
- `product_id`
- `lot_id`
- `quantity`
- `name_snapshot`
- `brand_snapshot`
- `original_unit_price_bdt`
- `unit_price_bdt`
- `line_total_bdt`

#### `payments`

- `id`
- `order_id`
- `provider`
- `provider_reference`
- `status`
- `amount_bdt`
- `currency`
- `failure_reason`
- `paid_at`
- `created_at`
- `updated_at`

Secrets and raw provider responses must never be stored as ordinary frontend-visible data.

#### `impact_events`

- `id`
- `order_id`
- `user_id`
- `seller_id`
- `product_id`
- `type`
- `quantity`
- `weight_kg`
- `value_bdt`
- `occurred_at`

#### `notifications`

- `id`
- `user_id`
- `type`
- `title`
- `body`
- `read_at`
- `created_at`

#### `audit_logs`

- `id`
- `actor_user_id`
- `actor_role`
- `action`
- `entity_type`
- `entity_id`
- `before_snapshot`
- `after_snapshot`
- `ip_hash`
- `user_agent_hash`
- `created_at`

Audit logs are append-only and should not contain secrets or raw sensitive form values.

### 5.2 Required indexes

- `categories.slug`
- `products.slug`, `products.status`, `products.featured`, `products.category_id`
- `products.brand`
- Full-text or search vector for English and optional Bangla names/descriptions
- `inventory_lots.product_id`, `inventory_lots.expiry_date`, `inventory_lots.status`
- `cart_items.cart_id`, `cart_items.product_id`
- `wishlist_items.user_id`
- `orders.user_id`, `orders.status`, `orders.order_number`
- `order_items.order_id`, `order_items.product_id`
- `audit_logs.actor_user_id`, `audit_logs.entity_type/entity_id`

### 5.3 Database constraints

- Foreign keys for all ownership and product relationships
- Unique constraints for slugs, order numbers, cart products, and wishlist products
- Check constraints for quantities and non-negative prices
- Status enums or constrained string values
- Product status and seller ownership rules enforced in application transactions
- Optimistic locking or atomic stock reservation
- Database transactions for add-to-cart, checkout, stock reservation, and order creation

## 6. API design

### 6.1 Routing convention

Use versioned Next.js Route Handlers:

```text
/api/v1/catalog/categories
/api/v1/catalog/products
/api/v1/catalog/products/[id]
/api/v1/search
/api/v1/cart
/api/v1/cart/items
/api/v1/cart/items/[productId]
/api/v1/wishlist
/api/v1/wishlist/[productId]
/api/v1/checkout/quote
/api/v1/checkout/orders
/api/v1/orders
/api/v1/orders/[id]
/api/v1/account/profile
/api/v1/account/addresses
/api/v1/seller/profile
/api/v1/seller/products
/api/v1/seller/inventory
/api/v1/seller/orders
/api/v1/seller/pricing
/api/v1/impact
```

Do not expose internal database IDs or Supabase service operations unnecessarily.

### 6.2 Public endpoints

- `GET /catalog/categories`
- `GET /catalog/products`
- `GET /catalog/products/[id]`
- `GET /search`
- `GET /seller/[slug]` public profile summary, if approved

Public responses should contain only fields needed by the frontend.

### 6.3 Authenticated endpoints

- Profile and addresses
- Cart and wishlist
- Checkout quote and order creation
- Customer order history
- Recently viewed synchronization only if added later

### 6.4 Seller endpoints

- Seller profile and verification status
- Product CRUD
- Inventory lot CRUD
- Price rule CRUD
- Seller order fulfillment
- Seller impact metrics

Every seller mutation requires both authentication and `seller_profiles.owner_user_id == session.user.id`, enforced by RLS and application authorization.

### 6.5 HTTP behavior

Use:

- `200` successful read/update
- `201` created
- `204` successful deletion
- `400` invalid request
- `401` unauthenticated
- `403` authenticated but unauthorized
- `404` missing or hidden resource
- `409` quantity/stock/state conflict
- `422` domain validation failure
- `429` rate limited

Standard error:

```json
{
  "error": {
    "code": "STOCK_CONFLICT",
    "message": "The requested quantity is no longer available.",
    "requestId": "opaque-request-id"
  }
}
```

Do not return SQL details, stack traces, internal IDs, or secret/provider responses.

### 6.6 Server authoritative operations

Cart mutations must:

1. Authenticate or associate a secure guest session.
2. Validate product existence and active status.
3. Read current stock in a transaction.
4. Clamp or reject requested quantities.
5. Persist only product IDs and quantities.

Checkout must:

1. Read cart server-side.
2. Revalidate active products and stock.
3. Recalculate original prices, current prices, discounts, delivery, and totals.
4. Reserve stock transactionally.
5. Create an order and idempotency record.
6. Create a payment intent only if a payment provider is approved.
7. Return an order reference and opaque order state.

The browser must not submit a price or delivery total that is accepted as authoritative.

## 7. Authentication

Recommended model:

- Supabase Auth as the identity provider
- Short-lived access tokens with secure refresh/session handling
- Next.js server session verification
- Server-side route authorization
- Email verification and password recovery
- Optional phone/OTP provider in a later approval step
- MFA recommended for seller and privileged roles

Do not implement custom password/token storage.

Supported initial providers:

- Email and password
- Magic link, optional
- Google/OAuth, optional and approval-dependent

Do not store email/password data in localStorage or client state.

## 8. Authorization

Implement role-based access using authenticated claims or a server-validated role table.

Recommended roles:

- `customer`
- `seller`
- `support`
- `admin`

Current UI pages are demonstrations. They must not become privileged until server-backed authentication and authorization exist.

Authorization rules:

- Customers can read/update their own profile, addresses, cart, wishlist, and orders.
- Sellers can only mutate their own seller profile, products, lots, price rules, and relevant orders.
- Support can read limited customer/seller records and must have auditable escalation.
- Admin can manage verification and platform configuration through server-only operations.

No public route or seller route may rely solely on hidden buttons or frontend state.

### Row-Level Security

Enable RLS on tables containing user or seller data.

Examples:

- `profiles`: self-only read/update
- `addresses`: owner-only
- `carts/cart_items`: owner or controlled guest session
- `wishlist_items`: owner-only
- `orders/order_items`: customer owner or assigned seller only
- `seller_profiles`: owner-only update
- `products/inventory_lots/price_rules`: seller owner or public read policy
- `audit_logs`: restricted insert/read

RLS is defense in depth; Route Handlers must also authorize operations.

## 9. Security architecture

### 9.1 Input and output protection

- Zod schema validation on every mutation
- `Content-Type` and request-size limits
- Server-side HTML/text sanitization for user-created content
- Canonicalization and length limits for names, descriptions, addresses, and slugs
- Strict product and quantity type validation
- Integer overflow-safe arithmetic
- Parameterized queries only

### 9.2 Browser and transport security

- HTTPS-only deployment
- Secure, HTTP-only, SameSite session cookies or verified Supabase session handling
- CSRF protection for cookie-authenticated state-changing requests
- Strict CSP with allowlists
- Security headers:
  - `Strict-Transport-Security`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Content-Security-Policy`
- Frame protection through CSP `frame-ancestors`

Approval is required for third-party script integrations because they affect CSP.

### 9.3 Cart and checkout security

- Never trust browser prices or stock
- Use database transactions and row locks for reservation
- Use an idempotency key per checkout attempt
- Generate order references server-side
- Record order snapshots to preserve historical pricing
- Revalidate the cart when opening checkout and again on submission
- Reject stale or conflicting stock quantity changes
- Prevent duplicate form submission and duplicate orders

### 9.4 Secret handling

- Never put private keys in `NEXT_PUBLIC_*`
- Do not send service-role credentials to browser code
- Store only server-only secrets in deployment secret managers
- Mask tokens in logs
- Rotate any secret immediately if Git exposure is later confirmed
- This repository audit found no credentials requiring rotation

### 9.5 Upload security

- Validate MIME type, file signature, dimensions, and size server-side
- Generate random storage names
- Strip or reject dangerous metadata
- Reject executable formats
- Prefer private storage and signed read URLs where inventory privacy is needed
- CDN public URLs are acceptable for product imagery if data is intentionally public

### 9.6 Abuse prevention

- Rate limit login, password recovery, checkout creation, search, uploads, and seller mutations
- Add account lockout/rate-limit controls
- Log authentication and authorization failures
- Validate webhook signatures for future payment and external integrations
- Use a WAF or provider edge rate limits in production

### 9.7 Logging and privacy

Log:

- Request ID
- Route/action
- Authenticated actor ID
- Outcome
- Timing
- Non-sensitive error code

Do not log:

- Passwords
- Raw checkout fields
- Access tokens
- Payment credentials
- Complete addresses
- Private keys
- Cookie values

## 10. Price, stock, and delivery architecture

The frontend may preview calculations, but all final values are server-owned.

Use a server service with these operations:

```text
calculateActivePrice(product, lot, at)
validateAndReserveCartStock(cart)
calculateCartTotals(cart, deliveryAddress)
createCheckoutQuote(cart, address)
createOrder(checkoutQuote, idempotencyKey)
```

Price calculation rules:

- Highest-priority applicable active rule wins, or configured evaluation order
- Fixed price and percentage rules must be validated
- Negative, zero, or invalid prices must be rejected
- Original price and final price are stored as whole BDT values
- Total savings are derived from original minus final price

Stock reservation rules:

- Reserve lot quantities at checkout
- Release reservations on cancellation or expiry
- Convert reservations to sold quantities on successful order
- Do not decrement stock without a transaction

Delivery fees should be stored as configuration or calculated by approved address/zone rules. Mock delivery values must remain clearly labeled as estimated in demo mode.

The existing 5,000 BDT free-delivery threshold and 80 BDT estimated fee are frontend defaults and require backend/product-owner approval before implementation.

## 11. Guest cart and migration

Phase 3 should support:

- Guest cart persisted locally during authentication-free browsing
- Server guest cart associated with a random, hashed, expiring key
- Merge guest cart on login
- Merge duplicate product quantities
- Reapply stock limits
- Remove unavailable/sold-out products safely
- Never migrate guest cart as a trusted price snapshot

The frontend may keep localStorage as an offline fallback, but the server must revalidate it.

## 12. Search and catalog

The initial implementation should use PostgreSQL search.

Recommended:

- Full-text search with generated/search-vector columns
- Trigram matching for typo tolerance if data volume justifies it
- Category, brand, price, discount, newest, and stock filters
- Cursor or keyset pagination for scalable results
- Stable sort keys
- Exact category slugs
- `featured` and `status` filters

Elasticsearch/Algolia/OpenSearch can be deferred until search behavior or volume requires it.

## 13. Realtime and notifications

Not required for initial launch.

Possible later features:

- Stock/order status updates
- Seller notifications
- Expiry alerts
- Impact events
- Supabase Realtime or server-sent events

Email and notification providers must be selected and tested before Phase 3.9.

## 14. Payment and checkout

No real payments should be implemented by default. The frontend security audit confirmed this prototype should remain demo-only until owner approval.

Before real payment integration:

1. Select the payment provider and settlement currency.
2. Approve refund/cancellation policy.
3. Approve cash-on-delivery/online payment support.
4. Create server-side payment intents and webhook verification.
5. Store only provider references, not card details or raw credentials.
6. Separate demo order states from real order states.

Approval required:

- Payment provider
- Delivery provider
- COD availability
- Tax/VAT handling
- Refund window
- Marketplace vs. seller payment settlement

## 15. Frontend integration plan

### 15.1 Repository abstraction

Keep the existing `productRepository` interface as an adapter boundary.

Implement:

- `SeedProductRepository` for current demo mode
- `ApiProductRepository` for backend mode

Configuration for demo versus API mode must remain public and non-sensitive.

### 15.2 Cart integration

Move cart operations behind API calls, while retaining local optimistic state:

- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/[productId]`
- `DELETE /api/v1/cart/items/[productId]`

Rules:

- Product card/detail actions call the API
- Provider state synchronizes after server responses
- Rejected actions show understandable feedback
- Sold-out/stock conflicts are refreshed from server
- localStorage remains a guest fallback or is removed after server guest cart is stable

### 15.3 Wishlist integration

Replace or augment localStorage with:

- Authenticated wishlist API
- Duplicate-safe merge
- Cross-device synchronization
- Empty, loading, conflict, and error states

### 15.4 Checkout integration

Checkout should:

- Fetch and display server quote
- Submit address and idempotency key
- Disable duplicate submission
- Handle `409` stock conflict by refreshing cart/quote
- Show server-generated order reference
- Clear local cart only after confirmed successful server order
- Never accept prices submitted from browser state

### 15.5 Account and seller integration

Replace demo account and seller pages with server-backed data and route protection.

Seller routes must:

- Require authentication
- Require verified seller role where needed
- Return safe not-found/forbidden states
- Prevent direct URL access to seller operations

## 16. Migration sequence

### Phase 3.1 — Environment, schema, and migrations

- Configure separate environments
- Create Supabase project or approved alternative
- Add migrations for profiles, categories, products, images, inventory, and audit foundations
- Add RLS foundations
- Add seed migration for existing product data
- Add server-only environment documentation

### Phase 3.2 — Authentication and authorization

- Configure Supabase Auth or approved alternative
- Create login/signup/password recovery flows
- Implement server session verification
- Add profile creation and role mapping
- Protect account routes
- Implement RLS and Route Handler authorization

### Phase 3.3 — Catalog API

- Implement category and product APIs
- Migrate seed product data
- Implement search/filter/sort/pagination
- Add public image storage strategy
- Integrate `ApiProductRepository`
- Preserve direct product route behavior

### Phase 3.4 — Seller and inventory API

- Implement seller profile/onboarding
- Implement product and inventory CRUD
- Implement price-rule validation
- Implement verification-state checks
- Protect all seller mutations
- Replace demo seller dashboard

### Phase 3.5 — Cart and wishlist API

- Implement server cart and wishlist storage
- Implement guest cart merge
- Implement quantity/stock validation
- Implement optimistic frontend synchronization
- Add localStorage migration with server revalidation

### Phase 3.6 — Checkout and order engine

- Implement server quote calculation
- Implement stock reservation
- Implement address validation
- Implement order creation
- Implement idempotency
- Implement order status transitions
- Implement cancellation/refund stubs
- Keep payment as simulated until approval

### Phase 3.7 — Order, notification, and impact APIs

- Replace demo account/order/impact data
- Implement order history
- Implement seller fulfillment actions
- Implement impact event generation
- Implement basic notifications
- Add server-generated order references

### Phase 3.8 — Security hardening and testing

- Complete RLS tests
- Add authorization integration tests
- Add cart, stock, and checkout concurrency tests
- Add schema constraints and migration checks
- Add rate limits and security headers
- Add privacy-safe structured logging
- Add secret and dependency scans
- Conduct penetration review before production

### Phase 3.9 — Deployment and operations

- Configure staging and production
- Configure backups and restoration tests
- Configure database observability
- Add health/readiness endpoints
- Configure alerts
- Complete disaster recovery and incident response documentation
- Decide and optionally integrate real payment/delivery
- Remove demo-only routes or retain clearly labeled demos

## Phase 3.1 Implementation Decisions

The following decisions are final recommendations for implementation unless an owner approval entry in this section is marked unresolved. They are architecture decisions only and do not add migrations or source code.

### A. Multi-seller checkout and order structure

Use a parent `order` plus one `seller_order` (suborder) per seller represented in the checkout. A single checkout request may therefore create multiple seller-specific suborders while exposing one customer-facing order.

Recommended entities:

- `orders`
  - One row per customer checkout.
  - Owns the customer/order reference, address snapshot, parent totals, payment state, idempotency key, and overall status.
- `seller_orders`
  - One row per seller participating in the parent order.
  - Fields include `order_id`, `seller_id`, `status`, seller subtotal, seller discount/savings, seller delivery allocation, seller total, timestamps, and optional tracking or fulfillment fields.
- `order_items`
  - Add `seller_order_id` and `seller_id` foreign keys.
  - Each row belongs to exactly one parent order and exactly one suborder.

Recommended status hierarchy:

```text
Parent order:
pending_payment -> paid -> partially_fulfilled -> fulfilled
                                      \-> cancelled/refunded

Seller suborder:
confirmed -> preparing -> shipped -> delivered
                         \-> cancelled/refunded
```

The parent order should use derived aggregate states rather than arbitrary independent status updates:

- `confirmed` after all required stock reservations and payment initialization succeed.
- `partially_fulfilled` if at least one suborder is delivered and another remains active.
- `fulfilled` only when every non-cancelled suborder is delivered.
- `cancelled` only when no suborder can continue.
- `refunded` or `partially_refunded` according to payment outcomes.

Recommended checkout transaction:

1. Validate the cart and the signed-in or guest owner.
2. Snapshot one server-calculated quote for the complete cart.
3. Group cart items by seller and calculate a seller-level delivery allocation using an owner-approved delivery policy.
4. Atomically reserve every lot.
5. Insert the parent order, all seller suborders, and all order items.
6. Initialize or defer payment depending on owner/provider approval.
7. Return one parent order reference and one or more suborder references.

Parent checkout must succeed atomically or fail with no partial stock reservation. Partial stock validation failures must return a `409` conflict containing only the affected product IDs and requested/current availability.

This structure is preferred over a separate independent order per seller because it preserves one cart, one customer checkout, one idempotency key, one payment attempt, and one parent order history. It is also better than splitting totals outside the database because seller fulfillment can operate independently while the parent remains auditable.

Unresolved owner approval:

- Whether delivery is allocated by seller, combined by the platform, or charged once.
- Whether a paid parent order may contain a later-cancelled suborder.
- Whether support/admin can move suborders independently.
- Whether the same checkout reference should be visible to all participating sellers.

### B. Inventory semantics and concurrency

Use three explicit stock counters for each inventory lot:

- `quantity_available`: immediately purchasable units not already reserved or sold.
- `quantity_reserved`: units held for pending checkout or another reserved operation.
- `quantity_sold`: units transferred to fulfilled/paid orders according to the approved order policy.

At initial import:

```text
quantity_available = on_hand
quantity_reserved = 0
quantity_sold = 0
```

For this model, never derive a fourth public stock number with inconsistent arithmetic. Public in-stock quantity is calculated by the server as:

```text
effective_available = GREATEST(quantity_available - quantity_reserved, 0)
```

The invariant is:

```text
quantity_available >= 0
quantity_reserved >= 0
quantity_sold >= 0
quantity_available >= quantity_reserved
```

Recommended reservation transitions:

1. `reserve(lot, quantity)`:
   - Run in a database transaction.
   - Lock the lot row with `SELECT ... FOR UPDATE`.
   - Verify `quantity_available - quantity_reserved >= quantity`.
   - Increment `quantity_reserved`.
   - Insert/refresh a reservation record with expiry and order/cart reference.

2. `convert_reservation_to_sale(lot, quantity)`:
   - Run only after the parent payment/approval policy confirms ownership.
   - Within the same transaction, decrement `quantity_reserved` and increment `quantity_sold`.
   - For on-hand accounting, the lot's `quantity_available` may also be decremented so the invariant becomes:

```text
on_hand_remaining = quantity_available - quantity_reserved
```

   - The recommended explicit formula for final stock is:

```text
quantity_available = previous quantity_available - reserved_quantity
quantity_reserved = previous quantity_reserved - reserved_quantity
quantity_sold = previous quantity_sold + reserved_quantity
```

This allows `quantity_available` to mean total on-hand less previous sold stock and `quantity_reserved` to mean currently held units. Public availability remains `quantity_available - quantity_reserved`.

Alternative paid-at-order semantics can reserve and decrement stock in one transition, but the above two-step reserve/conversion model is recommended because it prevents checkout abandonment from permanently consuming stock.

3. `release_reservation(lot, quantity)`:
   - Decrement `quantity_reserved`.
   - Do not decrement `quantity_sold`.
   - Revoke the reservation and make units available again.

4. `cancel_sold(lot, quantity)`:
   - Allowed only for an owner-approved cancellation/refund state.
   - Decrement `quantity_sold`.
   - Increment `quantity_available` unless a separate disposal/expired-lot policy requires otherwise.
   - Audit the reason and actor.

Reservation timeout:

- Every checkout reservation expires after a server-side TTL.
- The recommended initial TTL is 10 minutes, pending final owner approval.
- A scheduled worker or Supabase scheduled function releases expired reservations in a transaction.
- Checkout quote and order creation revalidate the reservation and current availability.
- A browser timeout must never release stock directly; only server logic may mutate reservations.

Overselling rules:

- Never decrement stock only by a row read in application code.
- Use lot-row locking or an atomic SQL update with a remaining-stock predicate.
- All cart, checkout, and seller stock mutations run in database transactions.
- Seller imports or inventory corrections must pass through the same service and use audit records.
- Cart quantities are maximum caps, not reservations.
- Stock is reserved only during a valid checkout attempt, not merely when a user adds an item.
- Duplicate checkout requests use the parent order `idempotency_key` and return the existing result.
- Failed payment or checkout must release reservations.
- Product status `sold-out` must be derived or synchronized by server inventory logic; browsers cannot set it.

Concurrency failure behavior:

- On lock conflict or insufficient stock, rollback every parent-order, suborder, reservation, and order-item write.
- Return `409 STOCK_CONFLICT` with an opaque product reference.
- Refresh the quote and cart before checkout retry.

Unresolved owner approval:

- Reservation TTL, recommended 10 minutes.
- Whether payment authorization, completed payment, or order fulfillment performs the final sold transition.
- Whether cancellations/restocks expired lots or seller-restricted lots.

### C. Deterministic pricing priority

Store each fixed or percentage rule with:

- `starts_at`
- `ends_at`
- `priority`
- `is_active`
- `fixed_price_bdt`
- `percentage_discount`
- `created_at`
- `updated_at`

A fixed price and a percentage rule are mutually exclusive alternatives, and the server must reject a rule containing both or neither. A rule must be positive and within approved constraints.

At a specific evaluation time, the server determines the active rule set by:

```text
is_active = true
AND starts_at <= evaluated_at
AND (ends_at IS NULL OR evaluated_at < ends_at)
AND product/lot is active
AND price-validity constraints pass
```

Apply this deterministic priority order:

1. Only active, valid rules apply.
2. Sort by explicit `priority DESC`.
3. Sort by `ends_at ASC NULLS LAST` so an ending-sooner rule wins when priority ties.
4. Sort by `starts_at DESC` so a newer rule wins.
5. Sort by `created_at DESC`.
6. Sort by stable `rule_id DESC` as the final tie breaker.

Fixed-price rules beat percentage rules only when both rules have the same priority and the fixed/percentage winner has not already been resolved. To avoid ambiguous marketplace behavior, fixed versus percentage priority is explicit rather than inferred:

```text
fixed-price rules are always evaluated before percentage rules
```

The complete priority order is therefore:

```text
priority DESC
-> fixed_rule DESC (fixed first)
-> ends_at ASC NULLS LAST
-> starts_at DESC
-> created_at DESC
-> rule_id DESC
```

Rule semantics:

- A fixed price cannot be above the original price.
- A percentage discount must be an integer from 1 through 100.
- The server rounds the resulting final price to the nearest whole BDT using one documented mode.
- Recommended rounding: round percentage results to the nearest whole taka, with `.5` rounded upward.
- The calculated price is bounded between `1 BDT` and the original price.

Example:

- Original: 100 BDT
- Fixed rule priority 50: 80 BDT
- Percentage rule priority 50: 20% -> 80 BDT
- Fixed rule wins because `fixed_rule DESC` is first.

Example where priority differs:

- Fixed rule priority 40: 75 BDT
- Percentage rule priority 60: 30% -> 70 BDT
- Percentage rule wins because priority is evaluated before fixed-versus-percentage behavior.

The server must store or snapshot the winning price at quote and order creation. The frontend never sends a winning price or discount amount. The same evaluation function must be used for catalog display, quote calculation, and order creation. The evaluation time is always `NOW()` on the server or the approved order transaction timestamp.

Unresolved owner approval:

- Whether 100% discounts are allowed.
- Minimum and maximum fixed-price rules.
- Rounding behavior.
- Whether fixed-price rules can coexist with percentage rules or should be mutually exclusive at product level.
- The existing frontend free-delivery threshold and 80 BDT mock fee.

### D. Secure guest cart session

Use a server-generated, random guest session token, not an email, product list, order ID, or predictable browser UUID.

Recommended guest identification:

- Generate at least 128 bits of cryptographically secure random material.
- Store only a hash of the guest token in the database.
- Return the plaintext token once to the browser using an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- Use a separate, non-readable guest identifier cookie name so application JavaScript cannot retrieve or modify it.
- Rotate the token after login or privilege elevation.
- Hash all guest token lookups before database access.
- Do not put guest tokens in URLs or analytics events.

The guest cookie is only a cart ownership mechanism. It must not grant account, seller, checkout, or payment authorization.

Recommended lifecycle:

- Default guest cart expiration: 30 days from last server activity, pending owner approval.
- Guest cart database cleanup: 35 days to permit grace cleanup and audit.
- Sliding expiration may refresh only on an authenticated server cart action.
- Expired cart IDs return an empty or migrated state, not a successful owner match.
- Guest cart and wishlist merge only after successful authentication.

Login merge transaction:

1. Authenticate the user and establish a server session.
2. Read the hash-associated guest cart with a transaction.
3. Lock the user's cart and the guest cart.
4. Read current server product, status, and stock data.
5. Merge quantities product by product:
   - if both carts contain the product, sum quantities;
   - never exceed effective stock;
   - if the requested quantity exceeds stock, set it to effective available;
   - unavailable or sold-out products are omitted and reported as conflicts.
6. Delete or mark the guest cart merged.
7. Revoke/rotate the guest cookie.
8. Revalidate total and clear only local data that the server successfully migrated.

Stock revalidation occurs:

- On every cart read
- After login merge
- Before checkout quote
- Again inside the checkout transaction
- Whenever a lot status or inventory changes

Browser localStorage is an optimistic guest fallback only. It must not be the source of truth. Server records must define cart state after authentication or a successful network response.

If JavaScript or browser storage is unavailable, server cookie state should still allow a guest cart to be associated and recovered.

Unresolved owner approval:

- Guest cart expiration, recommendation 30 days.
- Whether authenticated users receive persistent server carts across devices.
- Whether localStorage cart and server guest cart should merge or localStorage should stop being authoritative.
- Whether an unavailable merged item is silently removed or returned as a user-visible conflict.

### E. Supabase security model

Use three distinct trust boundaries:

1. Browser
   - Calls only public or authenticated Next.js Route Handlers.
   - Stores no secrets.
   - Holds public Supabase configuration only if direct Supabase Auth or storage features require it.
   - Never receives the Supabase service-role key.

2. Next.js server
   - Verifies Supabase Auth sessions.
   - Owns Route Handler authorization.
   - Uses the `anon`/public key for ordinary RLS-enforced operations when applicable.
   - Uses the service-role key only in narrowly isolated, server-only modules.

3. Supabase/PostgreSQL
   - Verifies RLS policies for ordinary client and service requests.
   - Enforces constraints and transaction invariants.
   - Provides database-backed authorization and auditing.

Recommended Next.js session flow:

1. Supabase Auth creates a signed session.
2. The server Route Handler receives the session through secure HTTP-only cookies or verified server-side session state.
3. The Route Handler validates and verifies the access token against the configured Supabase project.
4. The server loads or verifies the profile/role server-side.
5. The Route Handler authorizes the operation.
6. Ordinary database operations use the current user's session/RLS context.
7. Privileged operations switch to a service-role module only after explicit authorization.

Do not trust role claims stored only in browser state or submitted request fields. Roles and ownership must be read from server-validated profile/seller records or signed authenticated claims and then checked again against RLS/database ownership.

Recommended RLS responsibilities:

- Public read policies for active catalog data.
- Self-only policies for profile and address records.
- Owner-only policies for carts, wishlist, and order history.
- Seller-only policies for their products, lots, price rules, and suborders.
- Restricted insert/read policies for audit and notification records.
- Explicit public deny by default for admin and server-only tables.

RLS is mandatory but is not sufficient on its own. Route Handlers must validate:

- Actor identity
- Product and seller ownership
- Requested entity state
- Required role
- Request shape and idempotency
- Stock, pricing, and order invariants

Recommended service-role module rules:

- One server-only file or module may create the Supabase admin client.
- The module must not be imported by a `use client` component or an exported public helper.
- No Route Handler should accept a generic `bypassRLS` flag.
- Service-role use is limited to:
  - Auth account provisioning or deprovisioning
  - Checkout transaction orchestration
  - Reserved stock cleanup
  - Storage administration
  - Email/notification administration
  - Migration/administrative jobs
- Before service-role use, the Route Handler or server job must verify identity/role and log the privileged action.
- Service-role database writes must still use transactions, constraints, and audit records.

Recommended environment separation:

- Anonymous/public Supabase key:
  - Safe only if public configuration and RLS are correct.
  - May be referenced in the browser only for authenticated Supabase operations that require it.
- Supabase service-role key:
  - Server-only.
  - Never included in `NEXT_PUBLIC_*`.
  - Never placed in browser bundles, logs, source maps, or static outputs.
- Database URL:
  - Server-only.
- Auth provider secrets:
  - Server-only.
- Webhook/payment secrets:
  - Server-only.

Cookie and session security:

- Verify access tokens rather than trusting a raw cookie name.
- Use HTTP-only secure cookies.
- Apply `SameSite=Lax` unless a reviewed cross-site OAuth/payment flow requires another policy.
- CSRF-protect cookie-authenticated state-changing requests.
- Rotate refresh/session data according to Supabase and deployment capabilities.
- Never expose refresh tokens to application JavaScript.

If Next.js server sessions use Supabase SSR patterns, the server package must read secure cookies, exchange/refresh sessions only through server code, and maintain the same origin/CSRF protections. Direct browser access to database tables should remain disabled unless a reviewed RLS-backed feature specifically requires it.

Supabase Realtime, Storage signed URLs, and direct edge calls may bypass Route Handlers. Each additional direct capability requires a separate RLS policy and threat review.

Unresolved owner approval:

- Supabase versus separate PostgreSQL/identity provider.
- Cookie/session library and refresh strategy.
- Whether direct browser Supabase access is allowed at all.
- MFA requirement for sellers/admin/support.
- Supabase service-role key storage mechanism at deployment.
- Realtime enabled or deferred.

### Unresolved owner approvals for Phase 3.1

| Topic | Recommendation to implement unless owner decides otherwise | Approval required |
|---|---|---|
| Multi-seller fulfillment | Parent order plus one seller suborder per seller | Delivery allocation, partial-cancel/refund behavior, and seller visibility |
| Reservation timeout | 10 minutes | Final TTL and whether payment or fulfillment converts reservations to sales |
| Restocking cancelled sales | Restore stock only for an approved cancellation/refund policy | Cancelled/restock and expired-lot behavior |
| Price-rule priority | Priority, fixed-before-percentage, end time, start time, creation time, rule ID | 100% discounts, fixed/percentage coexistence, limits, and rounding |
| Delivery | Existing 80 BDT estimated fee and 5,000 BDT free threshold remain frontend defaults | Production delivery, allocation, and free-delivery rules |
| Guest cart | 30-day expiration, secure HTTP-only cookie, server-side hash lookup | Persistent cross-device guest/cart merge behavior and conflict UX |
| Supabase | Server-verifying Supabase Auth with RLS and narrowly isolated service-role operations | Platform choice, direct browser access, MFA, session strategy, and key storage |

## Phase 3.1 implementation priority

The following order is recommended for the first implementation slice:

1. Supabase project/environment and server-only secret split.
2. Profiles, roles, seller profiles, categories, products, product images, and inventory lots.
3. RLS foundations and server session verification.
4. Catalog and public read APIs.
5. Cart/wishlist tables and guest ownership.
6. Parent order, seller suborders, order items, reservation, and quote schema.
7. Checkout transaction and idempotency.
8. Seller mutations and audit logs.
9. Tests and security hardening.

## 17. Testing strategy

Required test groups:

- Database constraint and migration tests
- RLS authorization tests
- API validation tests
- Authentication and role tests
- Cart merge and quantity tests
- Stock reservation concurrency tests
- Checkout idempotency tests
- Duplicate order prevention tests
- Price and savings calculation tests
- Search/filter/pagination tests
- Seller ownership tests
- XSS and unsafe input tests
- CSRF/session tests
- Rate-limit tests
- Production build and route tests

No large testing stack should be introduced in the architecture phase. Add focused framework tooling during implementation.

## 18. Observability and operations

Minimum production controls:

- Request ID propagation
- Structured application logs
- Database error and latency monitoring
- Authentication failure monitoring
- Stock conflict metrics
- Checkout failure metrics
- Order state transition history
- Daily backup policy
- Quarterly restoration test
- Secret inventory and rotation process
- Dependency and vulnerability monitoring

Do not collect sensitive form values in analytics or error logs.

## 19. Data retention and privacy

Approval is required for:

- Account deletion retention period
- Order/address retention period
- Cart/wishlist retention period
- Notification retention period
- Audit-log retention period
- Analytics and cookie use
- Bangladesh privacy and consumer-data obligations

Recommended principle:

- Retain the minimum required for order fulfillment and audit
- Avoid storing unnecessary personal data
- Restrict support access
- Encrypt sensitive address/phone data at rest when required
- Document each PII field and purpose

## 20. Decisions requiring owner approval

The following decisions should not be treated as implemented choices:

1. Supabase versus an alternative PostgreSQL/Auth stack
2. Managed Next.js versus separate frontend/backend deployment
3. Email/password as launch authentication, plus optional OAuth
4. Whether seller login/verification is required at launch
5. Seller verification and payout model
6. Real payment provider
7. COD, online payment, or both
8. Delivery provider and delivery fee rules
9. Free-delivery threshold and whether 80 BDT is a production estimate
10. Tax/VAT inclusion and invoice requirements
11. Stock reservation timeout
12. Cancellation/refund policy
13. Guest cart retention period
14. Data retention periods
15. Public or private product image delivery
16. Search engine choice for future scale
17. Bangla content and search requirements
18. Whether demo account/seller routes remain publicly accessible

## 21. Explicit non-goals

Phase 3.0 does not implement:

- Backend source code
- Database migrations
- Authentication providers
- Real payments
- Live seller operations
- New frontend features
- Package installations
- Secrets or credentials
- Deployment or infrastructure provisioning
- Push or commit operations

## 22. Final recommendation

Proceed with Next.js Route Handlers, Supabase PostgreSQL/Auth/Storage, PostgreSQL RLS, Zod validation, integer BDT amounts, server-owned pricing/stock/order calculations, and a staged migration by Phases 3.1–3.9.

The implementation should begin with database and authorization foundations before adding seller mutations or checkout. Cart, pricing, and checkout must never be accepted as browser-authoritative values.
