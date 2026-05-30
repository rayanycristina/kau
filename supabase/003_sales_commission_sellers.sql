-- KAU AlphaSin - vendedores e comissao configuravel
-- Execute no Supabase SQL Editor se sua tabela sales ja existe.
-- Necessario para permitir Rayany e outros vendedores sem travar pelo check antigo.

alter table public.sales
  drop constraint if exists sales_seller_name_check;

alter table public.sales
  alter column seller_name type text;

alter table public.sales
  alter column commission_rate type numeric(7,4);

alter table public.sales
  alter column commission_rate set default 5.00;

create index if not exists sales_seller_name_idx on public.sales (seller_name);
create index if not exists sales_created_at_idx on public.sales (created_at desc);
