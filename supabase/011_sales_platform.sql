-- KAU v4.2.52 - plataforma de origem da venda.
-- Permite saber se a venda veio da Payt, Coinzz ou Logzz.

alter table public.sales
  add column if not exists sale_platform text;

alter table public.sales
  drop constraint if exists sales_sale_platform_check;

alter table public.sales
  add constraint sales_sale_platform_check
  check (sale_platform is null or sale_platform in ('payt', 'coinzz', 'logzz'));

create index if not exists sales_sale_platform_idx on public.sales (sale_platform);

notify pgrst, 'reload schema';
