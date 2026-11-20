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
