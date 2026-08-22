begin;

-- ============================================================
-- KAU — Campanhas e Performance de Tráfego
-- Migration 031
-- Estrutura aditiva para contas de anúncio, campanhas
-- e vínculos opcionais com vendas/despesas.
-- ============================================================


-- ============================================================
-- 1. CONTAS DE ANÚNCIO
-- ============================================================

create table if not exists public.ad_accounts (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  platform text not null,

  external_account_id text,

  status text not null default 'active',

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint ad_accounts_name_not_blank
    check (btrim(name) <> ''),

  constraint ad_accounts_platform_check
    check (
      platform in (
        'Meta Ads',
        'Google Ads',
        'TikTok Ads',
        'Outros'
      )
    ),

  constraint ad_accounts_status_check
    check (
      status in (
        'active',
        'inactive'
      )
    )
);


create unique index if not exists ad_accounts_normalized_name_platform_key
  on public.ad_accounts (
    lower(
      regexp_replace(
        btrim(name),
        '\s+',
        ' ',
        'g'
      )
    ),
    platform
  );


create index if not exists ad_accounts_status_idx
  on public.ad_accounts (status);



-- ============================================================
-- 2. CAMPANHAS
-- ============================================================

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  ad_account_id uuid
    references public.ad_accounts(id)
    on delete restrict,

  ad_platform text not null,

  product_name text,

  status text not null default 'active',

  external_campaign_id text,

  start_date date,

  end_date date,

  notes text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint campaigns_name_not_blank
    check (btrim(name) <> ''),

  constraint campaigns_ad_platform_check
    check (
      ad_platform in (
        'Meta Ads',
        'Google Ads',
        'TikTok Ads',
        'Outros'
      )
    ),

  constraint campaigns_status_check
    check (
      status in (
        'active',
        'paused',
        'archived'
      )
    ),

  constraint campaigns_date_range_check
    check (
      end_date is null
      or start_date is null
      or end_date >= start_date
    )
);


create unique index if not exists campaigns_normalized_name_account_key
  on public.campaigns (
    lower(
      regexp_replace(
        btrim(name),
        '\s+',
        ' ',
        'g'
      )
    ),
    coalesce(
      ad_account_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );


create index if not exists campaigns_account_idx
  on public.campaigns (ad_account_id);


create index if not exists campaigns_status_idx
  on public.campaigns (status);


create index if not exists campaigns_platform_idx
  on public.campaigns (ad_platform);



-- ============================================================
-- 3. VÍNCULO OPCIONAL VENDA → CAMPANHA
-- ============================================================

alter table public.sales
  add column if not exists campaign_id uuid
  references public.campaigns(id)
  on delete restrict;


create index if not exists sales_campaign_id_idx
  on public.sales (campaign_id);


comment on column public.sales.campaign_id is
  'Atribuição opcional a uma campanha. Vendas antigas, orgânicas ou ainda não atribuídas permanecem sem campanha.';



-- ============================================================
-- 4. VÍNCULO OPCIONAL DESPESA → CAMPANHA
-- ============================================================

alter table public.expenses
  add column if not exists campaign_id uuid
  references public.campaigns(id)
  on delete restrict;


create index if not exists expenses_campaign_id_idx
  on public.expenses (campaign_id);


comment on column public.expenses.campaign_id is
  'Atribuição opcional. Despesas históricas podem permanecer sem campanha. Somente despesas de Tráfego devem compor investimento de campanha.';



-- ============================================================
-- 5. UPDATED_AT
-- ============================================================

create or replace function public.set_campaign_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


drop trigger if exists set_ad_account_updated_at
  on public.ad_accounts;


create trigger set_ad_account_updated_at
before update on public.ad_accounts
for each row
execute function public.set_campaign_updated_at();


drop trigger if exists set_campaign_updated_at
  on public.campaigns;


create trigger set_campaign_updated_at
before update on public.campaigns
for each row
execute function public.set_campaign_updated_at();



-- ============================================================
-- 6. FUNÇÃO DE AUTORIZAÇÃO ADMIN
-- ============================================================

create or replace function public.is_active_campaign_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;


revoke all
on function public.is_active_campaign_admin()
from public, anon, authenticated;


grant execute
on function public.is_active_campaign_admin()
to authenticated;



-- ============================================================
-- 7. RLS
-- ============================================================

alter table public.ad_accounts
  enable row level security;


alter table public.campaigns
  enable row level security;



-- ============================================================
-- 8. POLICIES — CONTAS DE ANÚNCIO
-- ============================================================

drop policy if exists ad_accounts_read_authenticated
  on public.ad_accounts;


create policy ad_accounts_read_authenticated
on public.ad_accounts
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_active = true
  )
);


-- Remove eventual policy antiga com FOR ALL
drop policy if exists ad_accounts_write_admin
  on public.ad_accounts;


drop policy if exists ad_accounts_insert_admin
  on public.ad_accounts;


create policy ad_accounts_insert_admin
on public.ad_accounts
for insert
to authenticated
with check (
  public.is_active_campaign_admin()
);


drop policy if exists ad_accounts_update_admin
  on public.ad_accounts;


create policy ad_accounts_update_admin
on public.ad_accounts
for update
to authenticated
using (
  public.is_active_campaign_admin()
)
with check (
  public.is_active_campaign_admin()
);



-- ============================================================
-- 9. POLICIES — CAMPANHAS
-- ============================================================

drop policy if exists campaigns_read_authenticated
  on public.campaigns;


create policy campaigns_read_authenticated
on public.campaigns
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_active = true
  )
);


-- Remove eventual policy antiga com FOR ALL
drop policy if exists campaigns_write_admin
  on public.campaigns;


drop policy if exists campaigns_insert_admin
  on public.campaigns;


create policy campaigns_insert_admin
on public.campaigns
for insert
to authenticated
with check (
  public.is_active_campaign_admin()
);


drop policy if exists campaigns_update_admin
  on public.campaigns;


create policy campaigns_update_admin
on public.campaigns
for update
to authenticated
using (
  public.is_active_campaign_admin()
)
with check (
  public.is_active_campaign_admin()
);



-- ============================================================
-- 10. PERMISSÕES
-- ============================================================

-- Não permitir exclusão física por usuários normais/autenticados.
-- Campanhas devem ser arquivadas e contas desativadas.
revoke delete
on public.ad_accounts, public.campaigns
from public, anon, authenticated;


grant select
on public.ad_accounts, public.campaigns
to authenticated;


grant insert, update
on public.ad_accounts, public.campaigns
to authenticated;



-- ============================================================
-- 11. FINAL
-- ============================================================

commit;