-- KAU v4.2.57 - vincula saques as vendas que entraram no caixa
-- Execute no Supabase SQL Editor se a coluna sale_ids ainda nao existir.

alter table public.cash_withdrawals
  add column if not exists sale_ids text[] not null default '{}';

create index if not exists cash_withdrawals_sale_ids_gin_idx
on public.cash_withdrawals using gin (sale_ids);

notify pgrst, 'reload schema';
