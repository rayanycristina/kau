begin;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_name_check check (length(btrim(name)) between 2 and 160),
  constraint companies_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint companies_slug_unique unique (slug),
  constraint companies_status_check check (status in ('active', 'suspended'))
);

create table public.company_memberships (
  company_id uuid not null references public.companies(id) on delete restrict,
  user_id uuid not null references public.user_profiles(id) on delete restrict,
  role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id),
  constraint company_memberships_role_check check (role in ('owner', 'admin', 'seller', 'member'))
);

-- V1: um usuário operacional pertence a uma única empresa ativa.
create unique index company_memberships_single_active_company_per_user
  on public.company_memberships(user_id)
  where is_active = true;

create table public.platform_admins (
  user_id uuid primary key references public.user_profiles(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index company_memberships_company_active_idx
  on public.company_memberships(company_id, is_active);

insert into public.companies (id, name, slug, status)
values (
  '00000000-0000-4000-8000-000000000001',
  'KAU — Operação atual',
  'kau-operacao-atual',
  'active'
);

do $$
begin
  if not exists (
    select 1
    from public.user_profiles
    where id = '2cfd619b-b78d-4da0-9ec1-6484331d5978'
      and role = 'admin'
      and is_active = true
  ) then
    raise exception 'A proprietária confirmada da operação não existe como admin ativo em user_profiles.';
  end if;
end;
$$;

insert into public.company_memberships (company_id, user_id, role, is_active)
select
  '00000000-0000-4000-8000-000000000001',
  profile.id,
  case
    when profile.id = '2cfd619b-b78d-4da0-9ec1-6484331d5978' then 'owner'
    when profile.role = 'admin' then 'admin'
    else 'seller'
  end,
  profile.is_active
from public.user_profiles profile;

insert into public.platform_admins (user_id, is_active)
values ('2cfd619b-b78d-4da0-9ec1-6484331d5978', true);

create or replace function public.set_multitenant_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger companies_updated_at
before update on public.companies
for each row execute function public.set_multitenant_updated_at();

create trigger company_memberships_updated_at
before update on public.company_memberships
for each row execute function public.set_multitenant_updated_at();

alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;
alter table public.platform_admins enable row level security;

revoke all on public.companies, public.company_memberships, public.platform_admins
from public, anon, authenticated;

commit;
