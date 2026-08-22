begin;

create table if not exists public.capital_cycle_settings (
  id smallint primary key default 1,
  delinquency_days_after_delivery integer,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint capital_cycle_settings_singleton check (id = 1),
  constraint capital_cycle_settings_delinquency_days_check check (
    delinquency_days_after_delivery is null
    or delinquency_days_after_delivery between 1 and 3650
  )
);

insert into public.capital_cycle_settings (id, delinquency_days_after_delivery)
values (1, null)
on conflict (id) do nothing;

create or replace function public.set_capital_cycle_settings_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists capital_cycle_settings_updated_at on public.capital_cycle_settings;
create trigger capital_cycle_settings_updated_at
before update on public.capital_cycle_settings
for each row execute function public.set_capital_cycle_settings_updated_at();

create or replace function public.is_active_capital_cycle_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

revoke all on function public.is_active_capital_cycle_admin() from public, anon, authenticated;
grant execute on function public.is_active_capital_cycle_admin() to authenticated;

alter table public.capital_cycle_settings enable row level security;

drop policy if exists capital_cycle_settings_select_admin on public.capital_cycle_settings;
create policy capital_cycle_settings_select_admin on public.capital_cycle_settings
for select to authenticated
using (public.is_active_capital_cycle_admin());

drop policy if exists capital_cycle_settings_insert_admin on public.capital_cycle_settings;
create policy capital_cycle_settings_insert_admin on public.capital_cycle_settings
for insert to authenticated
with check (public.is_active_capital_cycle_admin());

drop policy if exists capital_cycle_settings_update_admin on public.capital_cycle_settings;
create policy capital_cycle_settings_update_admin on public.capital_cycle_settings
for update to authenticated
using (public.is_active_capital_cycle_admin())
with check (public.is_active_capital_cycle_admin());

revoke all on public.capital_cycle_settings from public, anon, authenticated;
grant select, insert, update on public.capital_cycle_settings to authenticated;

commit;
