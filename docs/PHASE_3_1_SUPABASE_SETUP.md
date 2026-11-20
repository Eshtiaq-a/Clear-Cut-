# Phase 3.1 Supabase Setup

This document describes the manual setup and validation steps for the Phase 3.1 Supabase foundation. It does not implement authentication UI, APIs, cart logic, checkout, payments, or seller backend behavior.

## 1. Create a Supabase project

1. Create a project in the Supabase dashboard.
2. Choose a region close to Bangladesh for lower latency.
3. Record the project reference and database region.
4. Do not copy the service-role key into source files or browser configuration.

## 2. Configure public environment variables

The existing `.env.local` and `.env.example` use these names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Copy `.env.example` to `.env.local` locally, then set:

- `NEXT_PUBLIC_SUPABASE_URL` to the project's API URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the project's publishable key or legacy anon key.

The existing `.env.local` is preserved and ignored by Git.

The optional server-only environment variable is:

- `SUPABASE_SERVICE_ROLE_KEY`

The optional direct database connection variable is:

- `SUPABASE_DB_URL`

It must never be given a `NEXT_PUBLIC_` prefix and must never be imported by a client component. It is intentionally empty in `.env.example` and is not required for the Phase 3.1 foundation.

Never commit real values. `.env.local` and other `.env*` files are ignored except `.env.example`.

## 3. Configure Next.js Supabase clients

Phase 3.1 adds:

- `src/lib/supabase/config.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`

The browser client uses only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The server client uses Next.js cookies and the anon key. It is suitable for cookie/session-aware server operations. The service-role key must not be placed in these browser or server helpers.

## 4. Run database migrations

Apply the migrations in timestamp order with the Supabase CLI or SQL migration runner:

1. `supabase/migrations/20261120040000_phase31_foundation.sql`
2. `supabase/migrations/20261120040100_seed_existing_catalog.sql`
3. `supabase/migrations/20261120040200_phase31_security_corrections.sql`

Example with an already-installed Supabase CLI:

```bash
supabase db push
```

Do not install the Supabase CLI solely for documentation review. In the dashboard, the SQL editor can also run each migration in timestamp order.

Before applying the migration to a shared project, create a database backup or verify that the project has no conflicting prior schema.

## 5. Seed the existing catalog

The seed migration:

- Uses stable `legacy_key` values such as `LC-001`.
- Preserves 22 existing product records.
- Preserves category names, Bangla names, descriptions, brands, prices, stock, images, and available seller metadata.
- Creates public seller profiles only for seller names already present in the seed.
- Does not invent user accounts or owner identities for demo sellers.
- Sets `owner_user_id` to null for seeded seller profiles.
- Uses `ON CONFLICT` updates for repeat-safe execution.

Re-running the seed migration is intended to be safe when the migration engine executes it once. Do not manually rerun an applied migration unless the SQL migration runner is known to support idempotent reapplication.

### Migration history implications

- Fresh Supabase projects should execute the foundation, seed, and security-correction migrations in timestamp order.
- Existing projects that already applied only the foundation and seed migrations can apply `20261120040200_phase31_security_corrections.sql` once.
- The security-correction migration is additive and corrective; it drops and recreates affected policies/views/functions rather than deleting application data.
- Seed reruns preserve existing verification and publication state; they update catalog content but do not overwrite inventory reservations or republish existing products.

## 6. Verify database connection

After migrations and environment configuration, start Next.js and call:

```text
GET /api/health/supabase
```

Expected responses:

- `200` with `{ "status": "ok", "database": "connected" }`
- `503` with no secret or database details when configuration or connectivity is unavailable

No health response includes credentials or a raw database error.

## 7. RLS protections

The migration enables RLS on profiles, addresses, seller records, catalog/private relations, carts, wishlist items, orders, suborders, items, payments, impact events, notifications, reservations, and audit logs.

Initial public policies permit:

- Public read of active categories
- Public read of active/sold-out products
- Public read of public product images and active price rules
- Public read of verified seller summaries
- Public read of product availability (`product_id` and `in_stock`) and public catalog storage

Protected policies permit:

- Users to read/update only their own profile
- Users to manage only their own addresses
- Users to manage only their own authenticated carts and cart items
- Users to manage only their own wishlist
- Users to read only their own orders
- Sellers to update only their own seller profile
- Sellers to manage only their own products, inventory, and price rules
- Sellers to view/update only their own seller suborders
- Users and sellers to read only their permitted order items, payments, impact events, and notifications

Seller mutations require all three conditions: the authenticated user owns the
seller profile, the seller profile is verified, and the user's profile is an
active `seller` account. Suspension or verification changes therefore remove
seller mutation access without changing ownership records.

Private tables with no user-facing policy, including inventory reservations and audit logs, are denied to ordinary anon/authenticated users unless a specific policy is added in a later phase.

Guest checkout idempotency is keyed by the server-derived `guest_key_hash` and
`idempotency_key` pair. Checkout code must hash and validate the secure guest
session token before creating an anonymous order; it must not accept a
client-supplied hash as proof of ownership. Authenticated orders use
`user_id` and `idempotency_key`.

Admin/support operations are not broad public operations. Later migrations must define narrowly scoped policies or service-role operations after authentication and role ownership are verified.

## 8. Storage foundation

The migration creates or updates a public `product-images` bucket:

- Maximum file size: 5 MB
- Allowed MIME types: JPEG, PNG, and WebP
- Public reads
- Verified-seller uploads only in an object path beginning with the user's auth UID
- Verified-seller updates/deletes only for objects owned by that user

Existing Unsplash URLs remain external seed references in `product_images.storage_path`. This phase does not migrate or upload existing image assets.

## 9. Dashboard manual steps

The following must be completed manually in the Supabase dashboard or deployment platform:

1. Confirm Auth email/password settings.
2. Configure permitted authentication redirect URLs later in Phase 3.2.
3. Configure email templates and sender settings later in Phase 3.2.
4. Create or assign verified seller ownership only after real auth users exist.
5. Verify RLS policy behavior with test users.
6. Configure database backups and point-in-time recovery.
7. Configure environment secrets for deployments.
8. Add the service-role key only to server-only deployment secret storage if it becomes necessary in later phases.

## 10. Live verification limitation

No live Supabase project or database migration was run during Phase 3.1 implementation. SQL and RLS statements require execution against a real project before they can be confirmed compatible.

The repository configuration can be checked locally with lint, TypeScript, and build. A live database connectivity result is not guaranteed until `/api/health/supabase` is called with valid project configuration.
