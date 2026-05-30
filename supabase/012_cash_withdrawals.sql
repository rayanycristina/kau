-- KAU v4.2.55 - registra saques do caixa
-- Use para subtrair do card Caixa valores que ja foram retirados da carteira.

create table if not exists public.cash_withdrawals (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount > 0),
  withdrawn_at date not null default current_date,
  note text,
  sale_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists cash_withdrawals_withdrawn_at_idx
on public.cash_withdrawals (withdrawn_at desc);

alter table public.cash_withdrawals enable row level security;

drop policy if exists "Allow anonymous cash withdrawals read" on public.cash_withdrawals;
create policy "Allow anonymous cash withdrawals read"
on public.cash_withdrawals
for select
using (true);

drop policy if exists "Allow anonymous cash withdrawals insert" on public.cash_withdrawals;
create policy "Allow anonymous cash withdrawals insert"
on public.cash_withdrawals
for insert
with check (true);

notify pgrst, 'reload schema';
