create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  is_seller boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id),
  name text,
  description text,
  category text,
  original_price numeric,
  discounted_price numeric,
  stock int,
  image_url text,
  expiry_date date,
  demand_level text,
  price_floor numeric,
  created_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  product_id uuid references public.products(id),
  quantity int not null default 1
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  total numeric,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  product_id uuid references public.products(id),
  quantity int,
  price numeric
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy profiles_owner_read
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy profiles_owner_insert
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy profiles_owner_update
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy products_public_read
on public.products for select
to anon, authenticated
using (true);

create policy products_seller_insert
on public.products for insert
to authenticated
with check (
  seller_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_seller = true
  )
);

create policy products_seller_update
on public.products for update
to authenticated
using (
  seller_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_seller = true
  )
)
with check (
  seller_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_seller = true
  )
);

create policy cart_items_owner_all
on public.cart_items for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy orders_owner_all
on public.orders for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy order_items_owner_all
on public.order_items for all
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_id
      and orders.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_id
      and orders.user_id = auth.uid()
  )
);

grant select on public.products to anon, authenticated;
grant select on public.profiles to authenticated;
grant insert on public.profiles to authenticated;
grant insert, update on public.products to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
