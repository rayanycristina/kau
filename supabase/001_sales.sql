-- KAU - Supabase sales persistence
-- Execute este SQL no Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text,
  city text not null,
  product_name text not null default 'Produto',
  quantity integer not null default 1 check (quantity > 0),
  total_amount numeric(12,2) not null check (total_amount > 0),
  seller_name text not null,
  sale_platform text check (sale_platform is null or sale_platform in ('payt', 'coinzz', 'logzz')),
  commission_rate numeric(7,4) not null default 5.00,
  commission_amount numeric(12,2) generated always as ((total_amount * commission_rate) / 100) stored,
  payment_method text not null default 'PAGAMENTO ANTECIPADO',
  payment_status text not null default 'paid' check (payment_status in ('paid', 'pending', 'cod')),
  delivery_type text not null default 'Entrega padrão',
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'scheduled', 'delivered', 'risk')),
  expected_payment_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_created_at_idx on public.sales (created_at desc);
create index if not exists sales_seller_name_idx on public.sales (seller_name);
create index if not exists sales_sale_platform_idx on public.sales (sale_platform);
create index if not exists sales_payment_status_idx on public.sales (payment_status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

alter table public.sales enable row level security;

-- O app usa API route do Next.js com SUPABASE_SERVICE_ROLE_KEY.
-- Service role ignora RLS. Mantemos RLS ligada para evitar leitura direta via client/browser.
-- Quando criar autenticação, adicione policies por usuário/vendedor aqui.
