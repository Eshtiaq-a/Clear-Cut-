create or replace function public.place_cod_order()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_total numeric := 0;
  v_cart record;
  v_product record;
begin
  if v_user_id is null then
    raise exception 'Unauthorized'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.cart_items
    where user_id = v_user_id
  ) then
    raise exception 'Your cart is empty';
  end if;

  -- Lock and validate every distinct product in the current user's cart.
  for v_cart in
    select
      ci.product_id,
      sum(ci.quantity)::integer as quantity
    from public.cart_items ci
    where ci.user_id = v_user_id
    group by ci.product_id
  loop
    select p.id, p.name, p.discounted_price, p.stock
    into v_product
    from public.products p
    where p.id = v_cart.product_id
    for update;

    if v_product.id is null then
      raise exception 'A product in your cart is no longer available';
    end if;

    if v_cart.quantity > coalesce(v_product.stock, 0) then
      raise exception '% has only % left in stock',
        v_product.name,
        coalesce(v_product.stock, 0);
    end if;

    v_total := v_total
      + (coalesce(v_product.discounted_price, 0) * v_cart.quantity);
  end loop;

  insert into public.orders (user_id, total, status)
  values (v_user_id, v_total, 'pending')
  returning id into v_order_id;

  -- Insert one snapshot row per distinct product and decrement stock exactly once.
  for v_cart in
    select
      ci.product_id,
      sum(ci.quantity)::integer as quantity
    from public.cart_items ci
    where ci.user_id = v_user_id
    group by ci.product_id
  loop
    select p.discounted_price, p.stock
    into v_product
    from public.products p
    where p.id = v_cart.product_id
    for update;

    insert into public.order_items (
      order_id,
      product_id,
      quantity,
      price
    )
    values (
      v_order_id,
      v_cart.product_id,
      v_cart.quantity,
      coalesce(v_product.discounted_price, 0)
    );

    update public.products
    set stock = v_product.stock - v_cart.quantity
    where id = v_cart.product_id;
  end loop;

  delete from public.cart_items
  where user_id = v_user_id;

  return v_order_id;
end;
$$;

revoke execute on function public.place_cod_order() from public;
revoke execute on function public.place_cod_order() from anon;
grant execute on function public.place_cod_order() to authenticated;
alter table public.products
  add column if not exists expiry_date date,
  add column if not exists demand_level text,
  add column if not exists price_floor numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_original_price_positive'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_original_price_positive check (original_price > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'products_discounted_price_valid'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_discounted_price_valid check (
        discounted_price >= 0
        and discounted_price <= original_price
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'products_stock_nonnegative'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_stock_nonnegative check (stock >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'products_price_floor_nonnegative'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_price_floor_nonnegative
        check (price_floor is null or price_floor >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'products_demand_level_valid'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_demand_level_valid check (
        demand_level is null or demand_level in ('low', 'medium', 'high')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cart_items_quantity_positive'
      and conrelid = 'public.cart_items'::regclass
  ) then
    alter table public.cart_items
      add constraint cart_items_quantity_positive check (quantity > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_total_nonnegative'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_total_nonnegative check (total >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'order_items_quantity_positive'
      and conrelid = 'public.order_items'::regclass
  ) then
    alter table public.order_items
      add constraint order_items_quantity_positive check (quantity > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'order_items_price_nonnegative'
      and conrelid = 'public.order_items'::regclass
  ) then
    alter table public.order_items
      add constraint order_items_price_nonnegative check (price >= 0);
  end if;
end
$$;

drop policy if exists orders_owner_all on public.orders;
create policy orders_owner_select
on public.orders for select
to authenticated
using (user_id = auth.uid());

drop policy if exists order_items_owner_all on public.order_items;
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
);

revoke insert, update, delete on public.orders from authenticated;
revoke insert, update, delete on public.order_items from authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
