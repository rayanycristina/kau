begin;

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_categories_name_not_blank check (btrim(name) <> ''),
  constraint expense_categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists expense_categories_normalized_name_key
  on public.expense_categories (lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));

insert into public.expense_categories (name, slug, is_system, is_active)
values
  ('Tráfego', 'traffic', true, true),
  ('Ferramentas', 'tools', true, true),
  ('Equipe', 'team', true, true),
  ('Impostos', 'taxes', true, true),
  ('Garantias', 'guarantees', true, true),
  ('Outros', 'other', true, true)
on conflict (slug) do update
set is_system = true,
    is_active = true,
    updated_at = now();

alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses drop constraint if exists expenses_category_fkey;
alter table public.expenses
  add constraint expenses_category_fkey foreign key (category)
  references public.expense_categories(slug) on update restrict on delete restrict;

create or replace function public.set_expense_category_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_expense_category_updated_at on public.expense_categories;
create trigger set_expense_category_updated_at
before update on public.expense_categories
for each row execute function public.set_expense_category_updated_at();

create or replace function public.protect_system_expense_category()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' and old.is_system then
    raise exception 'Categorias padrão do sistema não podem ser excluídas.';
  end if;
  if tg_op = 'UPDATE' and old.is_system and
     (new.slug is distinct from old.slug or new.is_system is distinct from true or new.is_active is distinct from true) then
    raise exception 'O identificador e o estado de uma categoria padrão não podem ser alterados.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists protect_system_expense_category on public.expense_categories;
create trigger protect_system_expense_category
before update or delete on public.expense_categories
for each row execute function public.protect_system_expense_category();

create or replace function public.is_active_expense_category_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

alter table public.expense_categories enable row level security;
drop policy if exists expense_categories_select_authenticated on public.expense_categories;
create policy expense_categories_select_authenticated on public.expense_categories
for select to authenticated using (true);
drop policy if exists expense_categories_insert_active_admin on public.expense_categories;
create policy expense_categories_insert_active_admin on public.expense_categories
for insert to authenticated with check (public.is_active_expense_category_admin());
drop policy if exists expense_categories_update_active_admin on public.expense_categories;
create policy expense_categories_update_active_admin on public.expense_categories
for update to authenticated using (public.is_active_expense_category_admin())
with check (public.is_active_expense_category_admin());

grant select, insert, update on public.expense_categories to authenticated;

commit;
