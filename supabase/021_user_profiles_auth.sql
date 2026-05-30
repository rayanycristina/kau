-- KAU v4.3 - user_profiles + associação auth.users
-- Execute UMA VEZ no Supabase SQL Editor (após 001-020)
-- Este SQL é aditivo: não altera sales, leads, cash_withdrawals nem apaga dados.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create type public.user_role as enum ('admin', 'seller');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  seller_display_name text not null,
  role public.user_role not null default 'seller',
  commission_percent numeric(7,2) not null default 5.00
    check (commission_percent >= 0 and commission_percent <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_seller_display_name_unique unique (seller_display_name)
);

create index if not exists user_profiles_role_idx on public.user_profiles (role);
create index if not exists user_profiles_seller_name_idx on public.user_profiles (seller_display_name);
create index if not exists user_profiles_active_idx on public.user_profiles (is_active) where is_active = true;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    id,
    email,
    full_name,
    seller_display_name,
    role,
    commission_percent
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data->>'seller_display_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'seller'),
    coalesce((new.raw_user_meta_data->>'commission_percent')::numeric, 5.00)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.user_profiles enable row level security;

drop policy if exists "Users read own profile" on public.user_profiles;
create policy "Users read own profile"
on public.user_profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Admins read all profiles" on public.user_profiles;
create policy "Admins read all profiles"
on public.user_profiles
for select
to authenticated
using (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid()
      and up.role = 'admin'
      and up.is_active = true
  )
);

notify pgrst, 'reload schema';
