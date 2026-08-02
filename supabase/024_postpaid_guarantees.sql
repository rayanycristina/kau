begin;

alter table public.expenses
  drop constraint if exists expenses_category_check;

alter table public.expenses add constraint expenses_category_check
  check (category in ('traffic','tools','team','taxes','guarantees','other'));

create table if not exists public.guarantee_settings (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (length(trim(platform)) > 0),
  payment_mode text not null check (length(trim(payment_mode)) > 0),
  default_amount numeric(12,2) not null check (default_amount > 0),
  is_active boolean not null default true,
  effective_from date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, payment_mode, effective_from)
);
create index if not exists guarantee_settings_lookup_idx on public.guarantee_settings (platform, payment_mode, is_active, effective_from desc);

create table if not exists public.postpaid_guarantees (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null unique references public.sales(id) on delete restrict,
  guarantee_type text not null default 'conditional' check (guarantee_type in ('conditional','mandatory')),
  guarantee_amount numeric(12,2) not null check (guarantee_amount > 0),
  is_active boolean not null default true,
  paid_amount numeric(12,2) check (paid_amount > 0),
  paid_at date,
  expense_id uuid unique references public.expenses(id) on delete restrict,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  reversed_by uuid references auth.users(id) on delete set null,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint postpaid_guarantees_payment_complete check ((paid_amount is null and paid_at is null and expense_id is null) or (paid_amount is not null and paid_at is not null and expense_id is not null))
);
create index if not exists postpaid_guarantees_active_idx on public.postpaid_guarantees (is_active, guarantee_type);
create index if not exists postpaid_guarantees_paid_at_idx on public.postpaid_guarantees (paid_at desc) where paid_at is not null;

create or replace function public.touch_guarantee_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists guarantee_settings_touch_updated_at on public.guarantee_settings;
create trigger guarantee_settings_touch_updated_at before update on public.guarantee_settings for each row execute function public.touch_guarantee_updated_at();
drop trigger if exists postpaid_guarantees_touch_updated_at on public.postpaid_guarantees;
create trigger postpaid_guarantees_touch_updated_at before update on public.postpaid_guarantees for each row execute function public.touch_guarantee_updated_at();

insert into public.guarantee_settings (platform, payment_mode, default_amount, is_active, effective_from)
values ('coinzz', 'PAD', 45.00, true, date '2026-07-01')
on conflict (platform, payment_mode, effective_from) do nothing;

create or replace function public.is_active_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_profiles where id = auth.uid() and role = 'admin' and is_active = true);
$$;

-- Regra financeira canônica do módulo de Garantias.
-- Para Coinzz PAD, somente payment_status='paid' confirma pagamento do cliente.
-- delivery_status e demais estados logísticos nunca participam desta decisão.
create or replace function public.is_guarantee_customer_payment_confirmed(p_payment_status text)
returns boolean language sql immutable set search_path = public as $$
  select lower(trim(coalesce(p_payment_status, ''))) = 'paid';
$$;

create or replace function public.is_guarantee_sale_financially_valid(p_order_status text)
returns boolean language sql immutable set search_path = public as $$
  select lower(trim(coalesce(p_order_status, 'active'))) = 'active';
$$;

alter table public.guarantee_settings enable row level security;
alter table public.postpaid_guarantees enable row level security;
drop policy if exists guarantee_settings_admin_select on public.guarantee_settings;
drop policy if exists guarantee_settings_admin_insert on public.guarantee_settings;
drop policy if exists guarantee_settings_admin_update on public.guarantee_settings;
drop policy if exists guarantee_settings_admin_delete on public.guarantee_settings;
create policy guarantee_settings_admin_select on public.guarantee_settings for select using (public.is_active_admin());
create policy guarantee_settings_admin_insert on public.guarantee_settings for insert with check (public.is_active_admin());
create policy guarantee_settings_admin_update on public.guarantee_settings for update using (public.is_active_admin()) with check (public.is_active_admin());
create policy guarantee_settings_admin_delete on public.guarantee_settings for delete using (public.is_active_admin());
drop policy if exists postpaid_guarantees_admin_select on public.postpaid_guarantees;
drop policy if exists postpaid_guarantees_admin_insert on public.postpaid_guarantees;
drop policy if exists postpaid_guarantees_admin_update on public.postpaid_guarantees;
drop policy if exists postpaid_guarantees_admin_delete on public.postpaid_guarantees;
create policy postpaid_guarantees_admin_select on public.postpaid_guarantees for select using (public.is_active_admin());
create policy postpaid_guarantees_admin_insert on public.postpaid_guarantees for insert with check (public.is_active_admin());
create policy postpaid_guarantees_admin_update on public.postpaid_guarantees for update using (public.is_active_admin()) with check (public.is_active_admin());
create policy postpaid_guarantees_admin_delete on public.postpaid_guarantees for delete using (public.is_active_admin());

create or replace function public.sync_postpaid_guarantee() returns trigger language plpgsql security definer set search_path = public as $$
declare eligible boolean; within_historical_scope boolean; configured_amount numeric(12,2);
begin
  within_historical_scope := (new.created_at at time zone 'UTC')::date >= date '2026-07-01';
  if not within_historical_scope then
    return new;
  end if;
  eligible := lower(coalesce(new.sale_platform,'')) = 'coinzz'
    and (upper(coalesce(new.payment_method,'')) = 'PAD' or upper(coalesce(new.delivery_type,'')) like 'PAD%')
    and public.is_guarantee_sale_financially_valid(new.order_status);
  if eligible then
    select default_amount into configured_amount from public.guarantee_settings
      where lower(platform) = 'coinzz' and upper(payment_mode) = 'PAD' and is_active and effective_from <= current_date
      order by effective_from desc limit 1;
    if configured_amount is not null then
      insert into public.postpaid_guarantees (sale_id, guarantee_type, guarantee_amount, is_active, created_by, updated_by)
      values (new.id, 'conditional', configured_amount, true, auth.uid(), auth.uid())
      on conflict (sale_id) do update set is_active = true, updated_by = auth.uid()
        where postpaid_guarantees.paid_at is null;
    end if;
  else
    update public.postpaid_guarantees set is_active = false, updated_by = auth.uid()
      where sale_id = new.id and paid_at is null;
  end if;
  return new;
end $$;

drop trigger if exists sales_sync_postpaid_guarantee on public.sales;
create trigger sales_sync_postpaid_guarantee after insert or update of sale_platform, payment_method, delivery_type, order_status, created_at on public.sales for each row execute function public.sync_postpaid_guarantee();

insert into public.postpaid_guarantees (sale_id, guarantee_type, guarantee_amount, is_active)
select s.id, 'conditional', cfg.default_amount, true
from public.sales s
cross join lateral (select default_amount from public.guarantee_settings where lower(platform)='coinzz' and upper(payment_mode)='PAD' and is_active and effective_from <= current_date order by effective_from desc limit 1) cfg
where lower(coalesce(s.sale_platform,''))='coinzz'
  and (upper(coalesce(s.payment_method,''))='PAD' or upper(coalesce(s.delivery_type,'')) like 'PAD%')
  and public.is_guarantee_sale_financially_valid(s.order_status)
  and (s.created_at at time zone 'UTC')::date >= date '2026-07-01'
on conflict (sale_id) do nothing;

create or replace function public.register_guarantee_payment(p_guarantee_id uuid, p_paid_amount numeric, p_paid_at date, p_notes text default null, p_admin_id uuid default auth.uid())
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.postpaid_guarantees%rowtype; s public.sales%rowtype; new_expense_id uuid;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_admin_id then raise exception 'Acesso negado'; end if;
  if not exists(select 1 from public.user_profiles where id=p_admin_id and role='admin' and is_active=true) then raise exception 'Acesso negado'; end if;
  if p_paid_amount is null or p_paid_amount <= 0 or p_paid_at is null then raise exception 'Pagamento inválido'; end if;
  select * into g from public.postpaid_guarantees where id=p_guarantee_id for update;
  if not found then raise exception 'Garantia não encontrada'; end if;
  if g.paid_at is not null or g.expense_id is not null then raise exception 'Garantia já paga'; end if;
  select * into s from public.sales where id=g.sale_id;
  if not g.is_active then raise exception 'Garantia inativa'; end if;
  if not public.is_guarantee_sale_financially_valid(s.order_status) then raise exception 'Venda financeiramente inválida'; end if;
  if g.guarantee_type = 'conditional' and public.is_guarantee_customer_payment_confirmed(s.payment_status) then
    raise exception 'Garantia liberada: o cliente já possui pagamento confirmado.';
  end if;
  insert into public.expenses(description,category,amount,expense_date,source,notes,created_by)
  values ('Garantia Coinzz — '||s.customer_name,'guarantees',round(p_paid_amount,2),p_paid_at,'Coinzz',concat('Pedido ',left(s.id::text,8),' · Venda ',s.id::text,case when p_notes is not null then ' · '||p_notes else '' end),p_admin_id) returning id into new_expense_id;
  update public.postpaid_guarantees set paid_amount=round(p_paid_amount,2),paid_at=p_paid_at,expense_id=new_expense_id,notes=coalesce(p_notes,notes),updated_by=p_admin_id,reversed_by=null,reversed_at=null where id=g.id;
  return jsonb_build_object('guarantee_id',g.id,'expense_id',new_expense_id);
end $$;

create or replace function public.reverse_guarantee_payment(p_guarantee_id uuid, p_admin_id uuid default auth.uid())
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.postpaid_guarantees%rowtype; old_expense_id uuid;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_admin_id then raise exception 'Acesso negado'; end if;
  if not exists(select 1 from public.user_profiles where id=p_admin_id and role='admin' and is_active=true) then raise exception 'Acesso negado'; end if;
  select * into g from public.postpaid_guarantees where id=p_guarantee_id for update;
  if not found then raise exception 'Garantia não encontrada'; end if;
  if g.paid_at is null or g.expense_id is null then raise exception 'Garantia sem pagamento'; end if;
  old_expense_id := g.expense_id;
  update public.postpaid_guarantees set paid_amount=null,paid_at=null,expense_id=null,updated_by=p_admin_id,reversed_by=p_admin_id,reversed_at=now() where id=g.id;
  delete from public.expenses where id=old_expense_id;
  return jsonb_build_object('guarantee_id',g.id,'reversed_expense_id',old_expense_id);
end $$;

revoke all on function public.register_guarantee_payment(uuid,numeric,date,text,uuid) from public, anon, authenticated;
revoke all on function public.reverse_guarantee_payment(uuid,uuid) from public, anon, authenticated;
grant execute on function public.register_guarantee_payment(uuid,numeric,date,text,uuid) to service_role;
grant execute on function public.reverse_guarantee_payment(uuid,uuid) to service_role;

commit;
