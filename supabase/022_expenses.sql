-- KAU - módulo Financeiro / Despesas
-- Execute somente após revisar as migrations anteriores. Não contém dados de demonstração.

create extension if not exists pgcrypto;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null check (length(trim(description)) > 0),
  category text not null check (category in ('traffic', 'tools', 'team', 'taxes', 'other')),
  amount numeric(14,2) not null check (amount > 0),
  expense_date date not null,
  source text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.expenses is 'Despesas operacionais cadastradas no módulo Financeiro do KAU.';
comment on column public.expenses.category is 'Categorias válidas: traffic, tools, team, taxes e other.';
comment on column public.expenses.created_by is 'Usuário administrador autenticado que criou o lançamento.';

create index if not exists expenses_expense_date_idx on public.expenses (expense_date desc);
create index if not exists expenses_category_idx on public.expenses (category);
create index if not exists expenses_category_date_idx on public.expenses (category, expense_date desc);

create or replace function public.set_expenses_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_expenses_updated_at();

alter table public.expenses enable row level security;

-- Somente administradores ativos podem consultar despesas.
drop policy if exists "Active admins read expenses" on public.expenses;
create policy "Active admins read expenses"
on public.expenses for select to authenticated
using (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'admin' and up.is_active = true
  )
);

-- Somente administradores ativos podem criar despesas em seu próprio nome.
drop policy if exists "Active admins create expenses" on public.expenses;
create policy "Active admins create expenses"
on public.expenses for insert to authenticated
with check (
  created_by = auth.uid() and exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'admin' and up.is_active = true
  )
);

drop policy if exists "Active admins update expenses" on public.expenses;
create policy "Active admins update expenses"
on public.expenses for update to authenticated
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

drop policy if exists "Active admins delete expenses" on public.expenses;
create policy "Active admins delete expenses"
on public.expenses for delete to authenticated
using (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'admin' and up.is_active = true
  )
);

notify pgrst, 'reload schema';
