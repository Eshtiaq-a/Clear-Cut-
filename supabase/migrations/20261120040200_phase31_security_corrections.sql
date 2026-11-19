-- Phase 3.1 security corrections.
-- Apply after 20261120040000 and 20261120040100.

-- Privilege changes are controlled by trusted server/admin operations.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role
     or new.status is distinct from old.status
  then
    if auth.uid() is not null
       and not exists (
         select 1
         from public.profiles
         where id = auth.uid()
           and role = 'admin'
           and status = 'active'
       )
    then
      raise exception 'Profile role and status changes require an active admin';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.admin_set_profile_privileges(
  p_target_user_id uuid,
  p_role profile_role,
  p_status profile_status
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  ) then
    raise exception 'Admin role required';
  end if;

  update public.profiles
  set role = p_role,
      status = p_status
  where id = p_target_user_id;

  if not found then
    raise exception 'Target profile not found';
  end if;
end;
$$;

revoke execute on function public.admin_set_profile_privileges(uuid, profile_role, profile_status) from public;
revoke execute on function public.admin_set_profile_privileges(uuid, profile_role, profile_status) from anon;
grant execute on function public.admin_set_profile_privileges(uuid, profile_role, profile_status) to authenticated;

revoke update(role, status) on public.profiles from anon;
revoke update(role, status) on public.profiles from authenticated;

-- Public seller information is limited to a security-invoker view.
drop policy if exists seller_profiles_public_read on public.seller_profiles;

create policy seller_profiles_public_read
on public.seller_profiles for select
to anon, authenticated
using (verification_status = 'verified');

revoke all on public.seller_profiles from anon;
revoke all on public.seller_profiles from authenticated;

grant select (
  business_name,
  slug,
  location,
  verification_status
) on public.seller_profiles to anon, authenticated;

grant update (
  business_name,
  slug,
  location
) on public.seller_profiles to authenticated;

grant insert (
  business_name,
  slug,
  location
) on public.seller_profiles to authenticated;

grant select on public.categories to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_images to anon, authenticated;
revoke all on public.price_rules from anon;
revoke all on public.price_rules from authenticated;
grant select on public.price_rules to anon, authenticated;

drop view if exists public.public_seller_profiles;
create view public.public_seller_profiles
with (security_invoker = true)
as
select business_name, slug, location, verification_status
from public.seller_profiles
where verification_status = 'verified';

revoke all on public.public_seller_profiles from public;
grant select on public.public_seller_profiles to anon, authenticated;

comment on view public.public_seller_profiles is
'Restricted public seller fields. Uses SECURITY INVOKER and seller-profile RLS.';

-- Public products require a verified seller, while seller-less seed/platform products remain public.
drop policy if exists products_public_read on public.products;

create policy products_public_read
on public.products for select
to anon, authenticated
using (
  deleted_at is null
  and status in ('active', 'sold-out')
  and (
    seller_id is null
    or exists (
      select 1
      from public.seller_profiles sp
      where sp.id = seller_id
        and sp.verification_status = 'verified'
    )
  )
);

drop policy if exists products_seller_insert on public.products;
create policy products_seller_insert
on public.products for insert
to authenticated
with check (
  seller_id is not null
  and public.is_seller_owner(seller_id)
  and exists (
    select 1
    from public.seller_profiles sp
    where sp.id = seller_id
      and sp.verification_status = 'verified'
  )
);

drop policy if exists products_seller_update on public.products;
create policy products_seller_update
on public.products for update
to authenticated
using (
  seller_id is not null
  and public.is_seller_owner(seller_id)
)
with check (
  seller_id is not null
  and public.is_seller_owner(seller_id)
  and exists (
    select 1
    from public.seller_profiles sp
    where sp.id = seller_id
      and sp.verification_status = 'verified'
  )
);

-- Public pricing rules are visible only for published products from no-seller or verified-seller records.
drop policy if exists price_rules_public_read on public.price_rules;

create policy price_rules_public_read
on public.price_rules for select
to anon, authenticated
using (
  is_active
  and starts_at <= now()
  and (ends_at is null or ends_at > now())
  and exists (
    select 1
    from public.products p
    left join public.seller_profiles sp on sp.id = p.seller_id
    where p.id = product_id
      and p.deleted_at is null
      and p.status in ('active', 'sold-out')
      and (p.seller_id is null or sp.verification_status = 'verified')
  )
);

-- Public inventory is represented only as product_id/in_stock.
drop policy if exists inventory_lots_public_read on public.inventory_lots;

revoke all on public.inventory_lots from anon;
revoke all on public.inventory_lots from authenticated;

drop policy if exists inventory_lots_seller_manage on public.inventory_lots;
create policy inventory_lots_seller_manage
on public.inventory_lots for all
to authenticated
using (
  seller_id is not null
  and public.is_seller_owner(seller_id)
  and exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.seller_id = inventory_lots.seller_id
  )
)
with check (
  seller_id is not null
  and public.is_seller_owner(seller_id)
  and exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.seller_id = inventory_lots.seller_id
  )
);

grant select, insert, update, delete on public.inventory_lots to authenticated;

drop view if exists public.public_product_availability;

create or replace function public.is_product_in_stock(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    exists (
      select 1
      from public.products p
      left join public.seller_profiles sp on sp.id = p.seller_id
      where p.id = p_product_id
        and p.deleted_at is null
        and p.status in ('active', 'sold-out')
        and (p.seller_id is null or sp.verification_status = 'verified')
    )
    and exists (
      select 1
      from public.inventory_lots l
      where l.product_id = p_product_id
        and l.status = 'active'
        and (l.quantity_available - l.quantity_reserved) > 0
    );
$$;

revoke execute on function public.is_product_in_stock(uuid) from public;
revoke execute on function public.is_product_in_stock(uuid) from anon;
grant execute on function public.is_product_in_stock(uuid) to anon, authenticated;

create view public.public_product_availability
with (security_invoker = true)
as
select
  p.id as product_id,
  public.is_product_in_stock(p.id) as in_stock
from public.products p
left join public.seller_profiles sp on sp.id = p.seller_id
where p.deleted_at is null
  and p.status in ('active', 'sold-out')
  and (p.seller_id is null or sp.verification_status = 'verified');

revoke all on public.public_product_availability from public;
grant select on public.public_product_availability to anon, authenticated;

comment on view public.public_product_availability is
'Restricted availability projection. It exposes only product_id and in_stock; it intentionally does not expose reserved, sold, exact quantities, seller IDs, or expiry data.';

-- Public product images remain public only for published products from no-seller or verified-seller records.
drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read
on public.product_images for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    left join public.seller_profiles sp on sp.id = p.seller_id
    where p.id = product_id
      and p.deleted_at is null
      and p.status in ('active', 'sold-out')
      and (p.seller_id is null or sp.verification_status = 'verified')
  )
);

-- Sellers may update only status and tracking on their own suborders.
drop policy if exists seller_orders_seller_update on public.seller_orders;

revoke update on public.seller_orders from anon;
revoke update on public.seller_orders from authenticated;

create or replace function public.update_seller_order_status(
  p_seller_order_id uuid,
  p_status text,
  p_tracking_reference text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_seller_id uuid;
  v_current_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_status not in ('confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded') then
    raise exception 'Invalid seller order status';
  end if;

  if p_tracking_reference is not null
     and char_length(p_tracking_reference) > 160
  then
    raise exception 'Tracking reference is too long';
  end if;

  select so.seller_id, so.status
  into v_seller_id, v_current_status
  from public.seller_orders so
  where so.id = p_seller_order_id;

  if v_seller_id is null then
    raise exception 'Seller order not found';
  end if;

  if not public.is_seller_owner(v_seller_id) then
    raise exception 'Seller order ownership required';
  end if;

  if not (
    (v_current_status = 'confirmed' and p_status in ('preparing', 'cancelled'))
    or (v_current_status = 'preparing' and p_status in ('shipped', 'cancelled'))
    or (v_current_status = 'shipped' and p_status in ('delivered', 'refunded'))
    or (v_current_status = 'delivered' and p_status = 'refunded')
  ) then
    raise exception 'Invalid seller order status transition';
  end if;

  update public.seller_orders
  set status = p_status,
      tracking_reference = coalesce(p_tracking_reference, tracking_reference),
      cancelled_at = case
        when p_status in ('cancelled', 'refunded') then coalesce(cancelled_at, now())
        else cancelled_at
      end
  where id = p_seller_order_id
    and seller_id = v_seller_id;
end;
$$;

revoke execute on function public.update_seller_order_status(uuid, text, text) from public;
revoke execute on function public.update_seller_order_status(uuid, text, text) from anon;
grant execute on function public.update_seller_order_status(uuid, text, text) to authenticated;

-- Restrict storage to verified seller owners.
drop policy if exists product_images_storage_authenticated_insert on storage.objects;
create policy product_images_storage_authenticated_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.seller_profiles sp
    where sp.owner_user_id = auth.uid()
      and sp.verification_status = 'verified'
  )
);

drop policy if exists product_images_storage_authenticated_update on storage.objects;
create policy product_images_storage_authenticated_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-images'
  and owner_id = auth.uid()::text
  and exists (
    select 1
    from public.seller_profiles sp
    where sp.owner_user_id = auth.uid()
      and sp.verification_status = 'verified'
  )
)
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.seller_profiles sp
    where sp.owner_user_id = auth.uid()
      and sp.verification_status = 'verified'
  )
);

drop policy if exists product_images_storage_authenticated_delete on storage.objects;
create policy product_images_storage_authenticated_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-images'
  and owner_id = auth.uid()::text
  and exists (
    select 1
    from public.seller_profiles sp
    where sp.owner_user_id = auth.uid()
      and sp.verification_status = 'verified'
  )
);

-- Review SECURITY DEFINER entry points and remove broad PUBLIC execution.
revoke execute on function public.handle_new_auth_user() from public;
revoke execute on function public.handle_new_auth_user() from anon;
revoke execute on function public.handle_new_auth_user() from authenticated;

revoke execute on function public.set_updated_at() from public;
revoke execute on function public.set_updated_at() from anon;
revoke execute on function public.set_updated_at() from authenticated;

revoke execute on function public.current_profile_role() from public;
revoke execute on function public.current_profile_role() from anon;
grant execute on function public.current_profile_role() to authenticated;

revoke execute on function public.is_seller_owner(uuid) from public;
revoke execute on function public.is_seller_owner(uuid) from anon;
grant execute on function public.is_seller_owner(uuid) to authenticated;

comment on function public.admin_set_profile_privileges(uuid, profile_role, profile_status) is
'Trusted mechanism for assigning profile roles/status. Callers must be authenticated active admins.';
