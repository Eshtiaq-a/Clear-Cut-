create extension if not exists vector;

alter table public.products
  add column if not exists embedding vector(384);

create index if not exists products_embedding_ivfflat_idx
  on public.products using ivfflat (embedding vector_cosine_ops);

create or replace function public.find_similar_products(
  p_product_id uuid,
  p_limit integer default 4
)
returns table (
  id uuid,
  name text,
  description text,
  category text,
  original_price numeric,
  discounted_price numeric,
  stock integer,
  image_url text,
  expiry_date date,
  demand_level text,
  price_floor numeric,
  created_at timestamptz,
  distance double precision
)
language sql
stable
set search_path = public
as $$
  with target as (
    select p.embedding
    from public.products p
    where p.id = p_product_id
      and p.embedding is not null
  )
  select
    p.id,
    p.name,
    p.description,
    p.category,
    p.original_price,
    p.discounted_price,
    p.stock,
    p.image_url,
    p.expiry_date,
    p.demand_level,
    p.price_floor,
    p.created_at,
    (p.embedding <=> target.embedding)::double precision as distance
  from public.products p
  cross join target
  where p.id <> p_product_id
    and p.embedding is not null
    and coalesce(p.stock, 0) > 0
    and (p.expiry_date is null or p.expiry_date >= current_date)
  order by p.embedding <=> target.embedding
  limit greatest(1, least(coalesce(p_limit, 4), 4));
$$;

grant execute on function public.find_similar_products(uuid, integer) to anon, authenticated;
