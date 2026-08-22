begin;

create table if not exists public.coproducers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  status text not null default 'active' check (status in ('active','inactive')),
  email text,
  phone text,
  notes text,
  user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coproducers_status_name_idx on public.coproducers (status, name);

create table if not exists public.product_coproducer_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  coproducer_id uuid not null references public.coproducers(id) on delete restrict,
  role text not null default 'coproducer' check (role in ('coproducer','partner','producer')),
  calculation_type text not null check (calculation_type in ('percent','fixed')),
  calculation_basis text not null default 'operation_revenue' check (calculation_basis = 'operation_revenue'),
  percent numeric(9,4),
  fixed_amount numeric(14,2),
  effective_from date not null,
  effective_to date,
  status text not null default 'active' check (status in ('active','ended')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_coproducer_rule_value check (
    (calculation_type = 'percent' and percent > 0 and percent <= 100 and fixed_amount is null)
    or (calculation_type = 'fixed' and fixed_amount > 0 and percent is null)
  ),
  constraint product_coproducer_rule_dates check (effective_to is null or effective_to >= effective_from),
  unique (product_id, coproducer_id, effective_from)
);

create index if not exists product_coproducer_rules_lookup_idx
  on public.product_coproducer_rules (product_id, status, effective_from desc);

create table if not exists public.sale_coproducer_obligations (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  coproducer_id uuid not null references public.coproducers(id) on delete restrict,
  rule_id uuid not null references public.product_coproducer_rules(id) on delete restrict,
  coproducer_name_snapshot text not null,
  role_snapshot text not null,
  calculation_type_snapshot text not null,
  calculation_basis_snapshot text not null,
  basis_amount_snapshot numeric(14,2) not null check (basis_amount_snapshot >= 0),
  percent_snapshot numeric(9,4),
  fixed_amount_snapshot numeric(14,2),
  amount_snapshot numeric(14,2) not null check (amount_snapshot > 0),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  paid_at date,
  expense_id uuid unique references public.expenses(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_coproducer_snapshot_value check (
    (calculation_type_snapshot = 'percent' and percent_snapshot is not null and fixed_amount_snapshot is null)
    or (calculation_type_snapshot = 'fixed' and fixed_amount_snapshot is not null and percent_snapshot is null)
  ),
  constraint sale_coproducer_payment_complete check (
    (status = 'paid' and paid_at is not null and expense_id is not null)
    or (status <> 'paid' and paid_at is null and expense_id is null)
  ),
  unique (sale_id, rule_id)
);

create index if not exists sale_coproducer_obligations_status_idx on public.sale_coproducer_obligations (status, created_at desc);
create index if not exists sale_coproducer_obligations_sale_idx on public.sale_coproducer_obligations (sale_id);

insert into public.expense_categories (name, slug, is_system, is_active)
values ('Coprodutores', 'coproducers', true, true)
on conflict (slug) do update set is_system = true, is_active = true, updated_at = now();

alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses add constraint expenses_category_check check (
  category = any (array['traffic','tools','team','taxes','guarantees','other','products','shipping','coproducers']::text[])
);

create or replace function public.touch_participation_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger coproducers_touch_updated_at before update on public.coproducers
for each row execute function public.touch_participation_updated_at();
create trigger product_coproducer_rules_touch_updated_at before update on public.product_coproducer_rules
for each row execute function public.touch_participation_updated_at();
create trigger sale_coproducer_obligations_touch_updated_at before update on public.sale_coproducer_obligations
for each row execute function public.touch_participation_updated_at();

create or replace function public.prevent_overlapping_coproducer_rules()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'active' and exists (
    select 1 from public.product_coproducer_rules r
    where r.product_id = new.product_id and r.coproducer_id = new.coproducer_id
      and r.id <> new.id and r.status = 'active'
      and daterange(r.effective_from, coalesce(r.effective_to, 'infinity'::date), '[]')
          && daterange(new.effective_from, coalesce(new.effective_to, 'infinity'::date), '[]')
  ) then raise exception 'Já existe uma regra vigente para este coprodutor no período informado.'; end if;
  return new;
end;
$$;

create trigger prevent_overlapping_coproducer_rules before insert or update on public.product_coproducer_rules
for each row execute function public.prevent_overlapping_coproducer_rules();

create or replace function public.is_active_participation_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin' and is_active = true);
$$;

create or replace function public.protect_coproducer_snapshot()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'Participações históricas não podem ser excluídas.'; end if;
  if old.status = 'paid' and new is distinct from old then raise exception 'Participação paga não pode ser alterada.'; end if;
  if new.sale_id is distinct from old.sale_id or new.product_id is distinct from old.product_id
     or new.coproducer_id is distinct from old.coproducer_id or new.rule_id is distinct from old.rule_id
     or new.coproducer_name_snapshot is distinct from old.coproducer_name_snapshot
     or new.role_snapshot is distinct from old.role_snapshot
     or new.calculation_type_snapshot is distinct from old.calculation_type_snapshot
     or new.calculation_basis_snapshot is distinct from old.calculation_basis_snapshot
     or new.basis_amount_snapshot is distinct from old.basis_amount_snapshot
     or new.percent_snapshot is distinct from old.percent_snapshot
     or new.fixed_amount_snapshot is distinct from old.fixed_amount_snapshot
     or new.amount_snapshot is distinct from old.amount_snapshot then
    raise exception 'O snapshot financeiro da participação é imutável.';
  end if;
  return new;
end;
$$;

create or replace function public.protect_used_coproducer_rule()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'Regras de participação não podem ser excluídas.'; end if;
  if exists (select 1 from public.sale_coproducer_obligations where rule_id = old.id) and (
    new.product_id is distinct from old.product_id or new.coproducer_id is distinct from old.coproducer_id
    or new.role is distinct from old.role or new.calculation_type is distinct from old.calculation_type
    or new.calculation_basis is distinct from old.calculation_basis or new.percent is distinct from old.percent
    or new.fixed_amount is distinct from old.fixed_amount or new.effective_from is distinct from old.effective_from
  ) then raise exception 'Uma regra já utilizada não pode alterar seu histórico financeiro.'; end if;
  return new;
end;
$$;

create trigger protect_used_coproducer_rule before update or delete on public.product_coproducer_rules
for each row execute function public.protect_used_coproducer_rule();

create trigger protect_sale_coproducer_snapshot before update or delete on public.sale_coproducer_obligations
for each row execute function public.protect_coproducer_snapshot();

create or replace function public.protect_participation_expense()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.sale_coproducer_obligations where expense_id = old.id) then
    raise exception 'Esta despesa é gerenciada pelo módulo Participações.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger protect_participation_expense before update or delete on public.expenses
for each row execute function public.protect_participation_expense();

create or replace function public.sync_sale_coproducer_obligations()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_sale_date date := (new.created_at at time zone 'UTC')::date;
  v_rule record;
  v_amount numeric(14,2);
begin
  if new.deleted_at is not null or lower(coalesce(new.order_status, 'active')) <> 'active' then
    update public.sale_coproducer_obligations set status = 'cancelled', updated_by = new.manual_costs_created_by
    where sale_id = new.id and status = 'pending';
    return new;
  end if;

  if new.product_id is null or new.operation_commission_amount is null or new.operation_commission_amount <= 0 then return new; end if;

  for v_rule in
    select r.*, c.name as coproducer_name from public.product_coproducer_rules r
    join public.coproducers c on c.id = r.coproducer_id
    where r.product_id = new.product_id and r.status = 'active' and c.status = 'active'
      and r.effective_from <= v_sale_date and (r.effective_to is null or r.effective_to >= v_sale_date)
  loop
    v_amount := case when v_rule.calculation_type = 'percent'
      then round(new.operation_commission_amount * v_rule.percent / 100, 2)
      else v_rule.fixed_amount end;
    if v_amount > 0 then
      insert into public.sale_coproducer_obligations
        (sale_id, product_id, coproducer_id, rule_id, coproducer_name_snapshot, role_snapshot,
         calculation_type_snapshot, calculation_basis_snapshot, basis_amount_snapshot,
         percent_snapshot, fixed_amount_snapshot, amount_snapshot, created_by, updated_by)
      values
        (new.id, new.product_id, v_rule.coproducer_id, v_rule.id, v_rule.coproducer_name, v_rule.role,
         v_rule.calculation_type, v_rule.calculation_basis, new.operation_commission_amount,
         v_rule.percent, v_rule.fixed_amount, v_amount, new.manual_costs_created_by, new.manual_costs_created_by)
      on conflict (sale_id, rule_id) do nothing;
    end if;
  end loop;
  return new;
end;
$$;

create trigger sync_sale_coproducer_obligations_after_sale
after insert or update of product_id, operation_commission_amount, deleted_at, order_status on public.sales
for each row execute function public.sync_sale_coproducer_obligations();

create or replace function public.register_coproducer_participation_payment(
  p_obligation_id uuid, p_confirmed_amount numeric, p_paid_at date, p_admin_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_item public.sale_coproducer_obligations%rowtype; v_sale public.sales%rowtype; v_expense_id uuid;
begin
  if not exists (select 1 from public.user_profiles where id = p_admin_id and role = 'admin' and is_active = true)
  then raise exception 'Acesso negado.'; end if;
  if p_confirmed_amount is null or p_confirmed_amount <= 0 or p_paid_at is null then raise exception 'Informe data e valor válidos.'; end if;

  select * into v_item from public.sale_coproducer_obligations where id = p_obligation_id for update;
  if not found then raise exception 'Participação não encontrada.'; end if;
  if v_item.status = 'paid' then raise exception 'Esta participação já foi paga.'; end if;
  if v_item.status <> 'pending' then raise exception 'Esta participação não está disponível para pagamento.'; end if;
  if round(p_confirmed_amount,2) <> v_item.amount_snapshot then raise exception 'O valor confirmado difere da participação calculada.'; end if;
  select * into v_sale from public.sales where id = v_item.sale_id;
  if not found or v_sale.deleted_at is not null or lower(coalesce(v_sale.order_status,'active')) <> 'active'
  then raise exception 'A venda não está operacionalmente válida para pagamento desta participação.'; end if;

  insert into public.expenses (description, category, amount, expense_date, source, notes, created_by)
  values ('Participação — ' || v_item.coproducer_name_snapshot, 'coproducers', v_item.amount_snapshot,
          p_paid_at, 'Participação', 'Venda #' || upper(left(v_item.sale_id::text,8)), p_admin_id)
  returning id into v_expense_id;

  update public.sale_coproducer_obligations
  set status = 'paid', paid_at = p_paid_at, expense_id = v_expense_id, updated_by = p_admin_id
  where id = v_item.id;
  return jsonb_build_object('obligation_id', v_item.id, 'expense_id', v_expense_id);
end;
$$;

alter table public.coproducers enable row level security;
alter table public.product_coproducer_rules enable row level security;
alter table public.sale_coproducer_obligations enable row level security;

create policy coproducers_admin_select on public.coproducers for select to authenticated using (public.is_active_participation_admin());
create policy coproducers_admin_insert on public.coproducers for insert to authenticated with check (public.is_active_participation_admin());
create policy coproducers_admin_update on public.coproducers for update to authenticated using (public.is_active_participation_admin()) with check (public.is_active_participation_admin());
create policy product_coproducer_rules_admin_select on public.product_coproducer_rules for select to authenticated using (public.is_active_participation_admin());
create policy product_coproducer_rules_admin_insert on public.product_coproducer_rules for insert to authenticated with check (public.is_active_participation_admin());
create policy product_coproducer_rules_admin_update on public.product_coproducer_rules for update to authenticated using (public.is_active_participation_admin()) with check (public.is_active_participation_admin());
create policy sale_coproducer_obligations_admin_select on public.sale_coproducer_obligations for select to authenticated
using (public.is_active_participation_admin());

grant select, insert, update on public.coproducers, public.product_coproducer_rules to authenticated;
revoke delete on public.coproducers, public.product_coproducer_rules from public, anon, authenticated;
grant select on public.sale_coproducer_obligations to authenticated;
revoke insert, update, delete on public.sale_coproducer_obligations from public, anon, authenticated;
revoke all on function public.register_coproducer_participation_payment(uuid,numeric,date,uuid) from public, anon, authenticated;
grant execute on function public.register_coproducer_participation_payment(uuid,numeric,date,uuid) to service_role;

commit;
