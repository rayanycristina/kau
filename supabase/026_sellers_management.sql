-- KAU - gestão operacional de vendedores
-- Migration aditiva. Não executada automaticamente.

create extension if not exists pgcrypto;

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.user_profiles(id) on delete set null,
  full_name text not null,
  display_name text,
  username text,
  email text,
  phone text,
  commission_percent numeric(7,2) not null default 0
    check (commission_percent between 0 and 100),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sellers_full_name_not_blank check (btrim(full_name) <> ''),
  constraint sellers_owner_must_be_active check (not is_owner or status = 'active'),
  constraint sellers_owner_commission_zero check (not is_owner or commission_percent = 0)
);

create unique index if not exists sellers_full_name_unique_idx
  on public.sellers (lower(btrim(full_name)));
create unique index if not exists sellers_username_unique_idx
  on public.sellers (lower(btrim(username)))
  where username is not null and btrim(username) <> '';
create unique index if not exists sellers_email_unique_idx
  on public.sellers (lower(btrim(email)))
  where email is not null and btrim(email) <> '';
create index if not exists sellers_status_idx on public.sellers (status);

drop trigger if exists sellers_set_updated_at on public.sellers;
create trigger sellers_set_updated_at
before update on public.sellers
for each row execute function public.set_updated_at();

create or replace function public.protect_operation_owner_seller()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.is_owner then
    raise exception 'A dona da operação não pode ser excluída.';
  end if;
  if tg_op = 'UPDATE' and old.is_owner and (not new.is_owner or new.status <> 'active') then
    raise exception 'A dona da operação não pode ser removida nem desativada.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists sellers_protect_operation_owner on public.sellers;
create trigger sellers_protect_operation_owner
before delete or update of is_owner, status on public.sellers
for each row execute function public.protect_operation_owner_seller();

alter table public.sales
  add column if not exists seller_id uuid references public.sellers(id) on delete set null;

create index if not exists sales_seller_id_idx on public.sales (seller_id);

comment on column public.sales.seller_id is
  'Vínculo opcional com o cadastro operacional. Vendas legadas permanecem válidas somente com seller_name.';
comment on column public.sales.seller_name is
  'Snapshot do nome do vendedor no momento da venda; não deve ser reescrito por alterações cadastrais.';
comment on column public.sales.commission_rate is
  'Snapshot do percentual de comissão do vendedor no momento da venda.';
comment on column public.sales.commission_amount is
  'Valor histórico da comissão do vendedor, calculado e armazenado a partir dos snapshots da venda.';

do $$
declare
  confirmed_owner_user_id constant uuid := '2cfd619b-b78d-4da0-9ec1-6484331d5978'::uuid;
  rayany_seller_id uuid;
begin
  if not exists (
    select 1
      from public.user_profiles up
     where up.id = confirmed_owner_user_id
       and up.role = 'admin'
       and up.is_active = true
  ) then
    raise exception 'Migration 026 interrompida: o perfil confirmado da dona (%) não existe ou não está ativo como admin.', confirmed_owner_user_id;
  end if;

  select s.id
    into rayany_seller_id
    from public.sellers s
   where s.user_id = confirmed_owner_user_id;

  if rayany_seller_id is null then
    if (
      select count(*)
        from public.sellers s
       where regexp_replace(lower(s.full_name), '[[:space:]]+', '', 'g') =
             regexp_replace(lower('Rayany Cristina Feitosa da Silva'), '[[:space:]]+', '', 'g')
    ) > 1 then
      raise exception 'Migration 026 interrompida: existem múltiplos cadastros com o nome da dona confirmada.';
    end if;

    select s.id
      into rayany_seller_id
      from public.sellers s
     where regexp_replace(lower(s.full_name), '[[:space:]]+', '', 'g') =
           regexp_replace(lower('Rayany Cristina Feitosa da Silva'), '[[:space:]]+', '', 'g');
  end if;

  if rayany_seller_id is null then
    select s.id
      into rayany_seller_id
      from public.sellers s
     where lower(btrim(s.username)) = 'rayany';
  end if;

  if exists (
    select 1
      from public.sellers s
     where s.is_owner = true
       and (rayany_seller_id is null or s.id <> rayany_seller_id)
  ) then
    raise exception 'Migration 026 interrompida: já existe outra pessoa marcada como dona da operação.';
  end if;

  if rayany_seller_id is not null and exists (
    select 1
      from public.sellers s
     where s.id <> rayany_seller_id
       and (
         s.user_id = confirmed_owner_user_id
         or regexp_replace(lower(s.full_name), '[[:space:]]+', '', 'g') =
            regexp_replace(lower('Rayany Cristina Feitosa da Silva'), '[[:space:]]+', '', 'g')
         or lower(btrim(s.username)) = 'rayany'
       )
  ) then
    raise exception 'Migration 026 interrompida: existem cadastros conflitantes para a dona confirmada; revise-os sem apagar o histórico.';
  end if;

  if rayany_seller_id is null then
    insert into public.sellers (
      user_id, full_name, display_name, username,
      commission_percent, status, is_owner
    ) values (
      confirmed_owner_user_id,
      'Rayany Cristina Feitosa da Silva',
      'Rayany Cristina',
      'rayany',
      0,
      'active',
      true
    )
    returning id into rayany_seller_id;
  else
    update public.sellers
       set user_id = confirmed_owner_user_id,
           full_name = 'Rayany Cristina Feitosa da Silva',
           display_name = 'Rayany Cristina',
           username = 'rayany',
           commission_percent = 0,
           status = 'active',
           is_owner = true
     where id = rayany_seller_id;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.sellers'::regclass
       and conname = 'sellers_owner_commission_zero'
  ) then
    alter table public.sellers
      add constraint sellers_owner_commission_zero
      check (not is_owner or commission_percent = 0);
  end if;
end $$;

create unique index if not exists sellers_single_owner_idx
  on public.sellers (is_owner)
  where is_owner = true;

alter table public.sellers enable row level security;

drop policy if exists "Active users read sellers" on public.sellers;
create policy "Active users read sellers"
on public.sellers for select to authenticated
using (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.is_active = true
  )
);

drop policy if exists "Active admins insert sellers" on public.sellers;
create policy "Active admins insert sellers"
on public.sellers for insert to authenticated
with check (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'admin' and up.is_active = true
  )
);

drop policy if exists "Active admins update sellers" on public.sellers;
create policy "Active admins update sellers"
on public.sellers for update to authenticated
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

-- Não há policy de DELETE: o histórico deve ser preservado.
notify pgrst, 'reload schema';
