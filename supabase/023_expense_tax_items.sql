-- KAU - componentes tributários vinculados às despesas
-- Migration aditiva: não altera nem remove despesas existentes e não insere dados fictícios.

create extension if not exists pgcrypto;

create table if not exists public.expense_tax_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  tax_name text not null check (length(trim(tax_name)) > 0),
  tax_code text not null check (length(trim(tax_code)) > 0),
  rate_percent numeric(8,4) not null check (rate_percent >= 0 and rate_percent <= 100),
  calculation_base numeric(14,2) not null check (calculation_base > 0),
  amount numeric(14,2) not null check (amount >= 0),
  calculation_mode text not null default 'on_top'
    check (calculation_mode in ('on_top', 'included')),
  is_auto_generated boolean not null default true,
  created_at timestamptz not null default now(),
  constraint expense_tax_items_expense_code_unique unique (expense_id, tax_code)
);

comment on table public.expense_tax_items is
  'Componentes tributários calculados e vinculados a uma despesa principal.';
comment on column public.expense_tax_items.calculation_base is
  'Valor líquido da despesa usado como base para calcular o tributo.';
comment on column public.expense_tax_items.calculation_mode is
  'on_top adiciona tributos à base; included indica que o total informado já continha os tributos.';
comment on column public.expense_tax_items.is_auto_generated is
  'Indica que o componente foi calculado automaticamente pelo módulo Financeiro.';

create index if not exists expense_tax_items_expense_id_idx
  on public.expense_tax_items (expense_id);
create index if not exists expense_tax_items_tax_code_idx
  on public.expense_tax_items (tax_code);
create index if not exists expense_tax_items_created_at_idx
  on public.expense_tax_items (created_at desc);

alter table public.expense_tax_items enable row level security;

drop policy if exists "Active admins read expense tax items" on public.expense_tax_items;
create policy "Active admins read expense tax items"
on public.expense_tax_items for select to authenticated
using (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'admin' and up.is_active = true
  )
);

drop policy if exists "Active admins create expense tax items" on public.expense_tax_items;
create policy "Active admins create expense tax items"
on public.expense_tax_items for insert to authenticated
with check (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'admin' and up.is_active = true
  )
  and exists (
    select 1 from public.expenses e
    where e.id = expense_id and e.created_by = auth.uid()
  )
);

drop policy if exists "Active admins update expense tax items" on public.expense_tax_items;
create policy "Active admins update expense tax items"
on public.expense_tax_items for update to authenticated
using (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'admin' and up.is_active = true
  )
)
with check (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'admin' and up.is_active = true
  )
);

drop policy if exists "Active admins delete expense tax items" on public.expense_tax_items;
create policy "Active admins delete expense tax items"
on public.expense_tax_items for delete to authenticated
using (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'admin' and up.is_active = true
  )
);

notify pgrst, 'reload schema';
