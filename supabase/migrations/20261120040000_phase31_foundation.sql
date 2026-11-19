create extension if not exists pgcrypto;

create type profile_role as enum ('customer', 'seller', 'support', 'admin');
create type profile_status as enum ('active', 'suspended', 'deleted');
create type verification_status as enum ('pending', 'verified', 'suspended');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  phone text,
  locale text not null default 'en',
  currency text not null default 'BDT',
  avatar_url text,
  role profile_role not null default 'customer',
  status profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) <= 100),
  constraint profiles_phone_length check (phone is null or char_length(phone) <= 32)
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    'customer',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.role = old.role;
  new.status = old.status;
  return new;
end;
$$;

create trigger profiles_protect_privileges
before update on public.profiles
for each row execute function public.protect_profile_privileges();

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid unique references auth.users(id) on delete set null,
  business_name text not null,
  slug text not null unique,
  location text,
  verification_status verification_status not null default 'pending',
  verified_at timestamptz,
  payout_status text not null default 'not_configured',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_profiles_name_length check (char_length(business_name) between 2 and 160),
  constraint seller_profiles_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create trigger seller_profiles_updated_at
before update on public.seller_profiles
for each row execute function public.set_updated_at();

create or replace function public.protect_seller_privileges()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.owner_user_id = auth.uid();
      new.verification_status = 'pending';
      new.verified_at = null;
      new.payout_status = 'not_configured';
    end if;
  else
    if auth.uid() is not null then
      new.owner_user_id = old.owner_user_id;
      new.verification_status = old.verification_status;
      new.verified_at = old.verified_at;
      new.payout_status = old.payout_status;
    end if;
  end if;
  return new;
end;
$$;

create trigger seller_profiles_protect_privileges
before insert or update on public.seller_profiles
for each row execute function public.protect_seller_privileges();

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  recipient_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  area text,
  city text,
  postal_code text,
  country_code text not null default 'BD',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint addresses_name_length check (char_length(recipient_name) between 2 and 100),
  constraint addresses_phone_length check (char_length(phone) between 6 and 32),
  constraint addresses_line_length check (char_length(line1) between 3 and 240)
);

create unique index addresses_one_default_per_user
on public.addresses(user_id)
where is_default;

create trigger addresses_updated_at
before update on public.addresses
for each row execute function public.set_updated_at();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_length check (char_length(name) between 2 and 100),
  constraint categories_sort_nonnegative check (sort_order >= 0)
);

create trigger categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  legacy_key text unique,
  seller_id uuid references public.seller_profiles(id) on delete set null,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  name_bn text,
  description text not null,
  description_bn text,
  brand text not null,
  condition text,
  original_price_bdt integer not null,
  current_price_bdt integer not null,
  featured boolean not null default false,
  status text not null default 'active',
  keywords text[] not null default '{}',
  highlights jsonb not null default '[]'::jsonb,
  specifications jsonb not null default '[]'::jsonb,
  expiry_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint products_name_length check (char_length(name) between 2 and 240),
  constraint products_brand_length check (char_length(brand) between 1 and 160),
  constraint products_original_price_positive check (original_price_bdt > 0),
  constraint products_current_price_positive check (current_price_bdt > 0),
  constraint products_current_price_not_above_original check (current_price_bdt <= original_price_bdt),
  constraint products_status_valid check (status in ('active', 'sold-out', 'draft', 'archived'))
);

create index products_category_featured_idx on public.products(category_id, featured) where deleted_at is null;
create index products_status_idx on public.products(status) where deleted_at is null;
create index products_seller_idx on public.products(seller_id);

create trigger products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint product_images_sort_nonnegative check (sort_order >= 0)
);

create unique index product_images_one_primary_per_product
on public.product_images(product_id)
where is_primary;

create unique index product_images_unique_source
on public.product_images(product_id, storage_path);

create table public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  legacy_key text unique,
  product_id uuid not null references public.products(id) on delete cascade,
  seller_id uuid references public.seller_profiles(id) on delete restrict,
  expiry_date date,
  quantity_available integer not null default 0,
  quantity_reserved integer not null default 0,
  quantity_sold integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_available_nonnegative check (quantity_available >= 0),
  constraint inventory_reserved_nonnegative check (quantity_reserved >= 0),
  constraint inventory_sold_nonnegative check (quantity_sold >= 0),
  constraint inventory_reserved_not_above_available check (quantity_reserved <= quantity_available),
  constraint inventory_status_valid check (status in ('active', 'expired', 'depleted', 'withdrawn'))
);

create index inventory_lots_product_idx on public.inventory_lots(product_id);
create index inventory_lots_expiry_idx on public.inventory_lots(expiry_date);

create trigger inventory_lots_updated_at
before update on public.inventory_lots
for each row execute function public.set_updated_at();

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.inventory_lots(id) on delete restrict,
  cart_id uuid,
  order_id uuid,
  quantity integer not null,
  status text not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_reservation_quantity_positive check (quantity > 0),
  constraint inventory_reservation_status_valid check (status in ('active', 'converted', 'released', 'expired'))
);

create index inventory_reservations_lot_status_idx
on public.inventory_reservations(lot_id, status);
create index inventory_reservations_expiry_idx
on public.inventory_reservations(expires_at) where status = 'active';

create trigger inventory_reservations_updated_at
before update on public.inventory_reservations
for each row execute function public.set_updated_at();

create table public.price_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  lot_id uuid references public.inventory_lots(id) on delete cascade,
  name text not null,
  fixed_price_bdt integer,
  percentage_discount integer,
  priority integer not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_rules_one_type_only check (
    (fixed_price_bdt is not null and percentage_discount is null)
    or (fixed_price_bdt is null and percentage_discount is not null)
  ),
  constraint price_rules_fixed_positive check (fixed_price_bdt is null or fixed_price_bdt > 0),
  constraint price_rules_percentage_range check (
    percentage_discount is null or (percentage_discount between 1 and 100)
  ),
  constraint price_rules_valid_window check (ends_at is null or ends_at > starts_at)
);

create trigger price_rules_updated_at
before update on public.price_rules
for each row execute function public.set_updated_at();

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  guest_key_hash text unique,
  status text not null default 'active',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carts_owner_one_type check (
    (user_id is not null and guest_key_hash is null)
    or (user_id is null and guest_key_hash is not null)
  ),
  constraint carts_status_valid check (status in ('active', 'merged', 'expired', 'checked_out'))
);

create index carts_guest_expiry_idx on public.carts(expires_at) where guest_key_hash is not null;

create trigger carts_updated_at
before update on public.carts
for each row execute function public.set_updated_at();

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_items_quantity_positive check (quantity > 0),
  constraint cart_items_unique_product unique (cart_id, product_id)
);

create trigger cart_items_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint wishlist_items_unique_product unique (user_id, product_id)
);

create index wishlist_items_user_idx
on public.wishlist_items(user_id, created_at desc);

alter table public.inventory_reservations
  add constraint inventory_reservations_cart_fk
  foreign key (cart_id) references public.carts(id) on delete set null;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending_payment',
  address_snapshot jsonb not null default '{}'::jsonb,
  original_total_bdt integer not null,
  subtotal_bdt integer not null,
  savings_bdt integer not null,
  delivery_fee_bdt integer not null default 0,
  total_bdt integer not null,
  currency text not null default 'BDT',
  idempotency_key text not null,
  placed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_totals_nonnegative check (
    original_total_bdt >= 0
    and subtotal_bdt >= 0
    and savings_bdt >= 0
    and delivery_fee_bdt >= 0
    and total_bdt >= 0
  ),
  constraint orders_currency_valid check (currency = 'BDT'),
  constraint orders_status_valid check (status in (
    'pending_payment',
    'paid',
    'confirmed',
    'partially_fulfilled',
    'fulfilled',
    'cancelled',
    'refunded',
    'partially_refunded'
  )),
  constraint orders_idempotency_unique unique (user_id, idempotency_key)
);

create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index orders_status_idx on public.orders(status);

create trigger orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.inventory_reservations
  add constraint inventory_reservations_order_fk
  foreign key (order_id) references public.orders(id) on delete set null;

create table public.seller_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  status text not null default 'confirmed',
  seller_subtotal_bdt integer not null,
  seller_savings_bdt integer not null,
  seller_delivery_fee_bdt integer not null default 0,
  seller_total_bdt integer not null,
  tracking_reference text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_orders_totals_nonnegative check (
    seller_subtotal_bdt >= 0
    and seller_savings_bdt >= 0
    and seller_delivery_fee_bdt >= 0
    and seller_total_bdt >= 0
  ),
  constraint seller_orders_status_valid check (status in (
    'confirmed',
    'preparing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
  )),
  constraint seller_orders_unique_seller unique (order_id, seller_id)
);

create index seller_orders_seller_status_idx
on public.seller_orders(seller_id, status);

create trigger seller_orders_updated_at
before update on public.seller_orders
for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  seller_order_id uuid not null references public.seller_orders(id) on delete restrict,
  seller_id uuid references public.seller_profiles(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  quantity integer not null,
  name_snapshot text not null,
  brand_snapshot text not null,
  original_unit_price_bdt integer not null,
  unit_price_bdt integer not null,
  line_total_bdt integer not null,
  created_at timestamptz not null default now(),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_prices_nonnegative check (
    original_unit_price_bdt >= 0
    and unit_price_bdt >= 0
    and line_total_bdt >= 0
  ),
  constraint order_items_unit_price_not_above_original check (
    unit_price_bdt <= original_unit_price_bdt
  )
);

create index order_items_order_idx on public.order_items(order_id);
create index order_items_seller_order_idx on public.order_items(seller_order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null,
  provider_reference text,
  status text not null default 'demo',
  amount_bdt integer not null,
  currency text not null default 'BDT',
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_positive check (amount_bdt >= 0),
  constraint payments_currency_valid check (currency = 'BDT'),
  constraint payments_status_valid check (status in (
    'demo',
    'pending',
    'authorized',
    'paid',
    'failed',
    'cancelled',
    'refunded',
    'partially_refunded'
  ))
);

create trigger payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create table public.impact_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  seller_id uuid references public.seller_profiles(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  type text not null,
  quantity integer not null,
  weight_kg numeric(12,3),
  value_bdt integer,
  occurred_at timestamptz not null default now(),
  constraint impact_quantity_positive check (quantity > 0),
  constraint impact_weight_nonnegative check (weight_kg is null or weight_kg >= 0),
  constraint impact_value_nonnegative check (value_bdt is null or value_bdt >= 0)
);

create index impact_events_user_idx on public.impact_events(user_id);
create index impact_events_order_idx on public.impact_events(order_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_text_lengths check (
    char_length(title) between 1 and 160
    and char_length(body) between 1 and 2000
  )
);

create index notifications_user_unread_idx
on public.notifications(user_id, created_at desc)
where read_at is null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_snapshot jsonb,
  after_snapshot jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_length check (char_length(action) between 1 and 160),
  constraint audit_logs_entity_length check (char_length(entity_type) between 1 and 160)
);

create index audit_logs_actor_idx on public.audit_logs(actor_user_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

create or replace function public.current_profile_role()
returns profile_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and status = 'active';
$$;

create or replace function public.is_seller_owner(p_seller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.seller_profiles
    where id = p_seller_id
      and owner_user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory_lots enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.price_rules enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.orders enable row level security;
alter table public.seller_orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.impact_events enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_own
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_admin_support_select
on public.profiles for select
to authenticated
using (public.current_profile_role() in ('admin', 'support'));

create policy seller_profiles_public_read
on public.seller_profiles for select
to anon, authenticated
using (verification_status = 'verified');

create policy seller_profiles_owner_update
on public.seller_profiles for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy seller_profiles_owner_select
on public.seller_profiles for select
to authenticated
using (owner_user_id = auth.uid());

create policy seller_profiles_owner_insert
on public.seller_profiles for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy addresses_owner_all
on public.addresses for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy categories_public_read
on public.categories for select
to anon, authenticated
using (is_active);

create policy products_public_read
on public.products for select
to anon, authenticated
using (deleted_at is null and status in ('active', 'sold-out'));

create policy products_seller_insert
on public.products for insert
to authenticated
with check (seller_id is not null and public.is_seller_owner(seller_id));

create policy products_seller_update
on public.products for update
to authenticated
using (seller_id is not null and public.is_seller_owner(seller_id))
with check (seller_id is not null and public.is_seller_owner(seller_id));

create policy product_images_public_read
on public.product_images for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.deleted_at is null
      and p.status in ('active', 'sold-out')
  )
);

create policy product_images_seller_manage
on public.product_images for all
to authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.seller_id is not null
      and public.is_seller_owner(p.seller_id)
  )
)
with check (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.seller_id is not null
      and public.is_seller_owner(p.seller_id)
  )
);

create policy inventory_lots_public_read
on public.inventory_lots for select
to anon, authenticated
using (
  status in ('active', 'depleted')
  and exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.deleted_at is null
      and p.status in ('active', 'sold-out')
  )
);

create policy inventory_lots_seller_manage
on public.inventory_lots for all
to authenticated
using (
  seller_id is not null
  and public.is_seller_owner(seller_id)
)
with check (
  seller_id is not null
  and public.is_seller_owner(seller_id)
);

create policy price_rules_public_read
on public.price_rules for select
to anon, authenticated
using (
  is_active
  and starts_at <= now()
  and (ends_at is null or ends_at > now())
);

create policy price_rules_seller_manage
on public.price_rules for all
to authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.seller_id is not null
      and public.is_seller_owner(p.seller_id)
  )
)
with check (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.seller_id is not null
      and public.is_seller_owner(p.seller_id)
  )
);

create policy carts_owner_all
on public.carts for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy cart_items_owner_all
on public.cart_items for all
to authenticated
using (
  exists (
    select 1
    from public.carts c
    where c.id = cart_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.carts c
    where c.id = cart_id
      and c.user_id = auth.uid()
  )
);

create policy wishlist_owner_all
on public.wishlist_items for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy orders_owner_select
on public.orders for select
to authenticated
using (user_id = auth.uid());

create policy seller_orders_seller_select
on public.seller_orders for select
to authenticated
using (public.is_seller_owner(seller_id));

create policy seller_orders_seller_update
on public.seller_orders for update
to authenticated
using (public.is_seller_owner(seller_id))
with check (public.is_seller_owner(seller_id));

create policy order_items_owner_select
on public.order_items for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.user_id = auth.uid()
  )
  or (seller_id is not null and public.is_seller_owner(seller_id))
);

create policy payments_owner_select
on public.payments for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.user_id = auth.uid()
  )
);

create policy impact_events_owner_select
on public.impact_events for select
to authenticated
using (
  user_id = auth.uid()
  or (seller_id is not null and public.is_seller_owner(seller_id))
);

create policy notifications_owner_all
on public.notifications for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_storage_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

create policy product_images_storage_authenticated_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy product_images_storage_authenticated_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-images'
  and owner_id = auth.uid()::text
)
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy product_images_storage_authenticated_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-images'
  and owner_id = auth.uid()::text
);
