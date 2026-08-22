begin;

-- public.products já é o catálogo oficial do KAU. A 034 apenas acrescenta
-- a unidade opcional necessária ao domínio de custos, sem reconstituir a tabela.
alter table public.products
  add column if not exists unit_name text default 'unidade';

create index if not exists products_active_name_idx
  on public.products (status, available_for_new_sales, name);

create table if not exists public.product_cost_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  unit_cost numeric(14,2) not null check (unit_cost > 0),
  effective_from date not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (product_id, effective_from)
);

create index if not exists product_cost_history_lookup_idx
  on public.product_cost_history (product_id, effective_from desc);

create table if not exists public.product_kits (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  name text not null,
  quantity integer not null check (quantity > 0),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_kits_name_not_blank check (btrim(name) <> '')
);

create unique index if not exists product_kits_normalized_name_key
  on public.product_kits (product_id, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));
-- Na reaplicação, a FK de sales depende desta UNIQUE e precisa sair primeiro.
alter table public.sales drop constraint if exists sales_product_kit_matches_product_fkey;
alter table public.product_kits drop constraint if exists product_kits_id_product_key;
alter table public.product_kits add constraint product_kits_id_product_key unique (id, product_id);
create index if not exists product_kits_active_idx
  on public.product_kits (product_id, is_active, quantity);

alter table public.sales
  add column if not exists product_id uuid references public.products(id) on delete restrict,
  add column if not exists product_kit_id uuid references public.product_kits(id) on delete restrict,
  add column if not exists product_quantity integer,
  add column if not exists unit_cost_snapshot numeric(14,2),
  add column if not exists total_product_cost_snapshot numeric(14,2),
  add column if not exists manual_shipping_amount numeric(14,2),
  add column if not exists manual_costs_created_by uuid references auth.users(id) on delete set null;

alter table public.sales add constraint sales_product_kit_matches_product_fkey
  foreign key (product_kit_id, product_id)
  references public.product_kits(id, product_id) on delete restrict;

alter table public.sales drop constraint if exists sales_product_quantity_check;
alter table public.sales add constraint sales_product_quantity_check
  check (product_quantity is null or product_quantity > 0);
alter table public.sales drop constraint if exists sales_unit_cost_snapshot_check;
alter table public.sales add constraint sales_unit_cost_snapshot_check
  check (unit_cost_snapshot is null or unit_cost_snapshot > 0);
alter table public.sales drop constraint if exists sales_total_product_cost_snapshot_check;
alter table public.sales add constraint sales_total_product_cost_snapshot_check
  check (total_product_cost_snapshot is null or total_product_cost_snapshot > 0);
alter table public.sales drop constraint if exists sales_manual_shipping_amount_check;
alter table public.sales add constraint sales_manual_shipping_amount_check
  check (manual_shipping_amount is null or manual_shipping_amount >= 0);
alter table public.sales drop constraint if exists sales_manual_product_snapshot_complete;
alter table public.sales add constraint sales_manual_product_snapshot_complete check (
  (product_id is null and product_kit_id is null and product_quantity is null and unit_cost_snapshot is null and total_product_cost_snapshot is null)
  or
  (product_id is not null and product_quantity is not null and unit_cost_snapshot is not null and total_product_cost_snapshot is not null
   and total_product_cost_snapshot = round(unit_cost_snapshot * product_quantity, 2))
);
alter table public.sales drop constraint if exists sales_manual_costs_only_for_manual_platform;
alter table public.sales add constraint sales_manual_costs_only_for_manual_platform check (
  lower(coalesce(sale_platform, '')) = 'manual'
  or (product_id is null and product_kit_id is null and product_quantity is null
      and unit_cost_snapshot is null and total_product_cost_snapshot is null
      and manual_shipping_amount is null and manual_costs_created_by is null)
);

create index if not exists sales_product_id_idx on public.sales (product_id) where product_id is not null;

create table if not exists public.manual_sale_cost_obligations (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  cost_kind text not null check (cost_kind in ('product','shipping')),
  product_id uuid references public.products(id) on delete restrict,
  description text not null check (btrim(description) <> ''),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  expense_id uuid unique references public.expenses(id) on delete restrict,
  paid_at date,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sale_id, cost_kind),
  constraint manual_sale_cost_product_reference check (
    (cost_kind = 'product' and product_id is not null) or (cost_kind = 'shipping' and product_id is null)
  ),
  constraint manual_sale_cost_payment_complete check (
    (status = 'paid' and expense_id is not null and paid_at is not null)
    or (status <> 'paid' and expense_id is null and paid_at is null)
  )
);

create index if not exists manual_sale_cost_obligations_status_idx
  on public.manual_sale_cost_obligations (status, created_at desc);
create index if not exists manual_sale_cost_obligations_sale_idx
  on public.manual_sale_cost_obligations (sale_id);

alter table public.expenses
  drop constraint if exists expenses_category_check;

alter table public.expenses
  add constraint expenses_category_check
  check (
    category = any (
      array[
        'traffic'::text,
        'tools'::text,
        'team'::text,
        'taxes'::text,
        'guarantees'::text,
        'other'::text,
        'products'::text,
        'shipping'::text
      ]
    )
  );

create or replace function public.touch_product_domain_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at before update on public.products
for each row execute function public.touch_product_domain_updated_at();
drop trigger if exists product_kits_touch_updated_at on public.product_kits;
create trigger product_kits_touch_updated_at before update on public.product_kits
for each row execute function public.touch_product_domain_updated_at();
drop trigger if exists manual_sale_costs_touch_updated_at on public.manual_sale_cost_obligations;
create trigger manual_sale_costs_touch_updated_at before update on public.manual_sale_cost_obligations
for each row execute function public.touch_product_domain_updated_at();

create or replace function public.is_active_product_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

create or replace function public.is_active_product_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role in ('admin','seller') and is_active = true
  );
$$;

alter table public.products enable row level security;
alter table public.product_cost_history enable row level security;
alter table public.product_kits enable row level security;
alter table public.manual_sale_cost_obligations enable row level security;

drop policy if exists products_active_users_select on public.products;
create policy products_active_users_select on public.products for select to authenticated
using (
  public.is_active_product_admin()
  or (
    status = 'active' and available_for_new_sales = true and exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'seller' and is_active = true
    )
  )
);
drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert on public.products for insert to authenticated
with check (public.is_active_product_admin());
drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products for update to authenticated
using (public.is_active_product_admin()) with check (public.is_active_product_admin());

drop policy if exists product_kits_active_users_select on public.product_kits;
create policy product_kits_active_users_select on public.product_kits for select to authenticated
using (
  public.is_active_product_admin()
  or (
    is_active and exists (
      select 1 from public.products p
      where p.id = product_kits.product_id
        and p.status = 'active'
        and p.available_for_new_sales = true
    ) and exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'seller' and is_active = true
    )
  )
);
drop policy if exists product_kits_admin_insert on public.product_kits;
create policy product_kits_admin_insert on public.product_kits for insert to authenticated
with check (public.is_active_product_admin() and created_by = auth.uid());
drop policy if exists product_kits_admin_update on public.product_kits;
create policy product_kits_admin_update on public.product_kits for update to authenticated
using (public.is_active_product_admin()) with check (public.is_active_product_admin());

drop policy if exists product_costs_admin_select on public.product_cost_history;
create policy product_costs_admin_select on public.product_cost_history for select to authenticated
using (public.is_active_product_admin());
drop policy if exists product_costs_admin_insert on public.product_cost_history;
create policy product_costs_admin_insert on public.product_cost_history for insert to authenticated
with check (public.is_active_product_admin() and created_by = auth.uid());

drop policy if exists manual_sale_costs_admin_select on public.manual_sale_cost_obligations;
create policy manual_sale_costs_admin_select on public.manual_sale_cost_obligations for select to authenticated
using (public.is_active_product_admin());
drop policy if exists manual_sale_costs_admin_insert on public.manual_sale_cost_obligations;
drop policy if exists manual_sale_costs_admin_update on public.manual_sale_cost_obligations;

grant select on public.products, public.product_kits to authenticated;
grant select on public.product_cost_history, public.manual_sale_cost_obligations to authenticated;
revoke insert, update, delete on public.manual_sale_cost_obligations from public, anon, authenticated;
revoke all on function public.is_active_product_admin() from public, anon;
revoke all on function public.is_active_product_user() from public, anon;
grant execute on function public.is_active_product_admin() to authenticated;
grant execute on function public.is_active_product_user() to authenticated;

create or replace function public.prepare_manual_sale_product_snapshot()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_product public.products%rowtype;
  v_kit public.product_kits%rowtype;
  v_cost numeric(14,2);
  v_sale_date date;
  v_snapshot_changed boolean;
begin
  if auth.role() <> 'service_role' then
    if lower(coalesce(new.sale_platform, '')) = 'manual'
       or (tg_op = 'UPDATE' and lower(coalesce(old.sale_platform, '')) = 'manual') then
      raise exception 'Custos da Venda Manual só podem ser alterados pelas APIs administrativas.';
    end if;
  end if;

  if tg_op = 'INSERT' then
    v_snapshot_changed := true;
  else
    v_snapshot_changed := new.sale_platform is distinct from old.sale_platform
      or new.product_id is distinct from old.product_id
      or new.product_kit_id is distinct from old.product_kit_id
      or new.product_quantity is distinct from old.product_quantity
      or new.unit_cost_snapshot is distinct from old.unit_cost_snapshot
      or new.total_product_cost_snapshot is distinct from old.total_product_cost_snapshot
      or new.created_at is distinct from old.created_at;
  end if;

  if lower(coalesce(new.sale_platform, '')) <> 'manual' then
    return new;
  end if;

  -- Registros manuais antigos continuam editáveis sem receber dados inventados.
  if new.product_id is null then
    if tg_op = 'INSERT' then raise exception 'Selecione um produto para a Venda Manual.'; end if;
    return new;
  end if;

  if not v_snapshot_changed then return new; end if;
  if new.manual_costs_created_by is null then
    raise exception 'Não foi possível identificar o responsável pelos custos da Venda Manual.';
  end if;

  select * into v_product from public.products where id = new.product_id;
  if not found or v_product.status is distinct from 'active' or v_product.available_for_new_sales is not true then
    raise exception 'O produto selecionado não está ativo.';
  end if;

  if new.product_kit_id is not null then
    select * into v_kit from public.product_kits
    where id = new.product_kit_id and product_id = new.product_id;
    if not found or not v_kit.is_active then
      raise exception 'O kit selecionado não está ativo para este produto.';
    end if;
    new.product_quantity := v_kit.quantity;
  end if;

  if new.product_quantity is null or new.product_quantity <= 0 then
    raise exception 'Informe uma quantidade válida para o produto.';
  end if;

  -- O KAU usa created_at::date (UTC date slice) como a data operacional exibida
  -- e filtrada em Vendas. A vigência do custo precisa usar a mesma convenção.
  v_sale_date := (new.created_at at time zone 'UTC')::date;
  select unit_cost into v_cost
  from public.product_cost_history
  where product_id = new.product_id and effective_from <= v_sale_date
  order by effective_from desc, created_at desc
  limit 1;
  if v_cost is null then
    raise exception 'Este produto não possui custo configurado para a data da venda.';
  end if;

  new.product_name := v_product.name;
  new.unit_cost_snapshot := v_cost;
  new.total_product_cost_snapshot := round(v_cost * new.product_quantity, 2);
  return new;
end;
$$;

drop trigger if exists sales_prepare_manual_sale_snapshot on public.sales;
create trigger sales_prepare_manual_sale_snapshot
before insert or update of sale_platform, product_id, product_kit_id,
  product_quantity, unit_cost_snapshot, total_product_cost_snapshot,
  created_at, manual_costs_created_by
on public.sales for each row execute function public.prepare_manual_sale_product_snapshot();

create or replace function public.protect_product_cost_history()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'O histórico de custo é imutável. Cadastre uma nova vigência.';
end;
$$;

drop trigger if exists product_cost_history_immutable on public.product_cost_history;
create trigger product_cost_history_immutable
before update or delete on public.product_cost_history
for each row execute function public.protect_product_cost_history();

create or replace function public.sync_manual_sale_cost_obligations()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_operational boolean;
  v_product_name text;
begin
  -- As policies legadas de sales ficam fora desta migration. Mesmo que um
  -- cliente antigo consiga atualizar uma linha, ele não pode acionar este
  -- domínio financeiro SECURITY DEFINER.
  if auth.role() <> 'service_role' then
    if lower(coalesce(new.sale_platform, '')) = 'manual'
       or (tg_op = 'UPDATE' and lower(coalesce(old.sale_platform, '')) = 'manual') then
      raise exception 'Custos da Venda Manual só podem ser alterados pelas APIs administrativas.';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if exists (
      select 1 from public.manual_sale_cost_obligations
      where sale_id = new.id and cost_kind = 'product' and status = 'paid'
    ) and (
      new.product_id is distinct from old.product_id
      or new.product_kit_id is distinct from old.product_kit_id
      or new.product_quantity is distinct from old.product_quantity
      or new.unit_cost_snapshot is distinct from old.unit_cost_snapshot
      or new.total_product_cost_snapshot is distinct from old.total_product_cost_snapshot
    ) then raise exception 'O custo de produto já pago não pode ser alterado.'; end if;

    if exists (
      select 1 from public.manual_sale_cost_obligations
      where sale_id = new.id and cost_kind = 'shipping' and status = 'paid'
    ) and new.manual_shipping_amount is distinct from old.manual_shipping_amount then
      raise exception 'O frete já pago não pode ser alterado.';
    end if;
  end if;

  v_operational := lower(coalesce(new.sale_platform, '')) = 'manual'
    and new.deleted_at is null
    and lower(coalesce(new.order_status, 'active')) = 'active';

  if not v_operational then
    update public.manual_sale_cost_obligations
       set status = 'cancelled', updated_by = coalesce(new.manual_costs_created_by, updated_by)
     where sale_id = new.id and status = 'pending';
    return new;
  end if;

  if new.product_id is null then
    return new;
  end if;

  if new.product_quantity is null or new.unit_cost_snapshot is null or new.total_product_cost_snapshot is null then
    raise exception 'Venda Manual sem snapshot completo do custo do produto.';
  end if;

  v_product_name := nullif(btrim(new.product_name), '');
  if v_product_name is null then raise exception 'Produto da Venda Manual não encontrado.'; end if;

  if exists (
    select 1 from public.manual_sale_cost_obligations
    where sale_id = new.id and cost_kind = 'product' and status = 'paid'
      and amount is distinct from new.total_product_cost_snapshot
  ) then
    raise exception 'O custo de produto já pago não pode ser alterado.';
  end if;

  insert into public.manual_sale_cost_obligations
    (sale_id, cost_kind, product_id, description, amount, status, created_by, updated_by)
  values
    (new.id, 'product', new.product_id, 'Produto / Fábrica — ' || v_product_name,
     new.total_product_cost_snapshot, 'pending', new.manual_costs_created_by, new.manual_costs_created_by)
  on conflict (sale_id, cost_kind) do update
     set product_id = excluded.product_id,
         description = excluded.description,
         amount = excluded.amount,
         status = 'pending',
         updated_by = excluded.updated_by
   where manual_sale_cost_obligations.status <> 'paid';

  if coalesce(new.manual_shipping_amount, 0) > 0 then
    if exists (
      select 1 from public.manual_sale_cost_obligations
      where sale_id = new.id and cost_kind = 'shipping' and status = 'paid'
        and amount is distinct from new.manual_shipping_amount
    ) then
      raise exception 'O frete já pago não pode ser alterado.';
    end if;

    insert into public.manual_sale_cost_obligations
      (sale_id, cost_kind, product_id, description, amount, status, created_by, updated_by)
    values
      (new.id, 'shipping', null, 'Frete / Logística', new.manual_shipping_amount,
       'pending', new.manual_costs_created_by, new.manual_costs_created_by)
    on conflict (sale_id, cost_kind) do update
       set amount = excluded.amount,
           status = 'pending',
           updated_by = excluded.updated_by
     where manual_sale_cost_obligations.status <> 'paid';
  else
    update public.manual_sale_cost_obligations
       set status = 'cancelled', updated_by = coalesce(new.manual_costs_created_by, updated_by)
     where sale_id = new.id and cost_kind = 'shipping' and status = 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists sales_sync_manual_sale_costs on public.sales;
create trigger sales_sync_manual_sale_costs
after insert or update of sale_platform, product_id, product_kit_id, product_quantity,
  unit_cost_snapshot, total_product_cost_snapshot, manual_shipping_amount,
  manual_costs_created_by, order_status, deleted_at
on public.sales for each row execute function public.sync_manual_sale_cost_obligations();

create or replace function public.protect_manual_sale_cost_expense()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (
    select 1 from public.manual_sale_cost_obligations
    where expense_id = old.id
  ) then
    raise exception 'Esta despesa é gerenciada pelos custos da Venda Manual e não pode ser alterada diretamente.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists expenses_protect_manual_sale_cost on public.expenses;
create trigger expenses_protect_manual_sale_cost
before update or delete on public.expenses
for each row execute function public.protect_manual_sale_cost_expense();

create or replace function public.create_product_with_initial_cost(
  p_name text,
  p_sku text,
  p_short_description text,
  p_unit_name text,
  p_image_url text,
  p_initial_unit_cost numeric,
  p_effective_from date,
  p_is_active boolean,
  p_admin_id uuid default auth.uid()
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_product_id uuid;
  v_cost_id uuid;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_admin_id then
    raise exception 'Acesso negado';
  end if;
  if not exists (
    select 1 from public.user_profiles
    where id = p_admin_id and role = 'admin' and is_active = true
  ) then raise exception 'Acesso negado'; end if;
  if btrim(coalesce(p_name, '')) = '' or btrim(coalesce(p_unit_name, '')) = '' then
    raise exception 'Informe nome e unidade do produto.';
  end if;
  if p_initial_unit_cost is null or p_initial_unit_cost <= 0 or p_effective_from is null then
    raise exception 'Informe custo inicial e vigência válidos.';
  end if;

  insert into public.products
    (name, sku, short_description, unit_name, image_url, status, available_for_new_sales)
  values
    (btrim(p_name), nullif(btrim(p_sku), ''), nullif(btrim(p_short_description), ''),
     btrim(p_unit_name), nullif(btrim(p_image_url), ''),
     case when coalesce(p_is_active, true) then 'active' else 'inactive' end,
     coalesce(p_is_active, true))
  returning id into v_product_id;

  insert into public.product_cost_history
    (product_id, unit_cost, effective_from, created_by)
  values
    (v_product_id, round(p_initial_unit_cost, 2), p_effective_from, p_admin_id)
  returning id into v_cost_id;

  return jsonb_build_object('product_id', v_product_id, 'cost_id', v_cost_id);
end;
$$;

create or replace function public.add_product_cost(
  p_product_id uuid,
  p_unit_cost numeric,
  p_effective_from date,
  p_admin_id uuid default auth.uid()
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cost_id uuid;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_admin_id then
    raise exception 'Acesso negado';
  end if;
  if not exists (
    select 1 from public.user_profiles
    where id = p_admin_id and role = 'admin' and is_active = true
  ) then raise exception 'Acesso negado'; end if;
  if p_unit_cost is null or p_unit_cost <= 0 or p_effective_from is null then
    raise exception 'Informe custo e vigência válidos.';
  end if;
  perform 1 from public.products where id = p_product_id for update;
  if not found then raise exception 'Produto não encontrado.'; end if;

  insert into public.product_cost_history
    (product_id, unit_cost, effective_from, created_by)
  values
    (p_product_id, round(p_unit_cost, 2), p_effective_from, p_admin_id)
  returning id into v_cost_id;

  return jsonb_build_object('product_id', p_product_id, 'cost_id', v_cost_id);
end;
$$;

create or replace function public.register_manual_sale_cost_payment(
  p_obligation_id uuid,
  p_confirmed_amount numeric,
  p_paid_at date,
  p_admin_id uuid default auth.uid()
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cost public.manual_sale_cost_obligations%rowtype;
  v_sale public.sales%rowtype;
  v_expense_id uuid;
  v_category text;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_admin_id then
    raise exception 'Acesso negado';
  end if;
  if not exists (
    select 1 from public.user_profiles
    where id = p_admin_id and role = 'admin' and is_active = true
  ) then raise exception 'Acesso negado'; end if;
  if p_paid_at is null or p_confirmed_amount is null or p_confirmed_amount <= 0 then
    raise exception 'Informe data e valor válidos.';
  end if;

  select * into v_cost from public.manual_sale_cost_obligations
  where id = p_obligation_id for update;
  if not found then raise exception 'Custo a pagar não encontrado.'; end if;
  if v_cost.status = 'paid' or v_cost.expense_id is not null then
    raise exception 'Este custo já foi pago.';
  end if;
  if v_cost.status <> 'pending' then raise exception 'Este custo não está disponível para pagamento.'; end if;
  if round(p_confirmed_amount, 2) is distinct from v_cost.amount then
    raise exception 'O valor confirmado difere do custo pendente. Corrija o custo antes de pagar.';
  end if;

  select * into v_sale from public.sales where id = v_cost.sale_id;
  if not found then raise exception 'Venda vinculada não encontrada.'; end if;
  if lower(coalesce(v_sale.sale_platform, '')) <> 'manual'
     or v_sale.deleted_at is not null
     or lower(coalesce(v_sale.order_status, 'active')) <> 'active' then
    raise exception 'A venda não está operacionalmente válida para pagamento deste custo.';
  end if;

  v_category := case v_cost.cost_kind when 'product' then 'products' else 'shipping' end;

  insert into public.expenses
    (description, category, amount, expense_date, source, notes, created_by)
  values
    (v_cost.description, v_category, v_cost.amount, p_paid_at, 'Venda Manual',
     'Venda ' || v_sale.id::text || ' · Cliente ' || v_sale.customer_name,
     p_admin_id)
  returning id into v_expense_id;

  update public.manual_sale_cost_obligations
     set status = 'paid', expense_id = v_expense_id, paid_at = p_paid_at,
         updated_by = p_admin_id
   where id = v_cost.id;

  return jsonb_build_object(
    'obligation_id', v_cost.id,
    'expense_id', v_expense_id,
    'paid_at', p_paid_at,
    'amount', v_cost.amount
  );
end;
$$;

revoke all on function public.register_manual_sale_cost_payment(uuid,numeric,date,uuid)
from public, anon, authenticated;
grant execute on function public.register_manual_sale_cost_payment(uuid,numeric,date,uuid)
to service_role;
revoke all on function public.create_product_with_initial_cost(text,text,text,text,text,numeric,date,boolean,uuid)
from public, anon, authenticated;
grant execute on function public.create_product_with_initial_cost(text,text,text,text,text,numeric,date,boolean,uuid)
to service_role;
revoke all on function public.add_product_cost(uuid,numeric,date,uuid)
from public, anon, authenticated;
grant execute on function public.add_product_cost(uuid,numeric,date,uuid)
to service_role;

comment on table public.products is 'Catálogo operacional de produtos físicos, sem controle de estoque.';
comment on table public.product_cost_history is 'Histórico imutável de custos unitários por vigência.';
comment on table public.product_kits is 'Quantidades recorrentes configuráveis por produto.';
comment on table public.manual_sale_cost_obligations is 'Custos de produto e frete da Venda Manual antes do pagamento real.';
comment on column public.sales.unit_cost_snapshot is 'Custo unitário vigente preservado no momento da Venda Manual.';
comment on column public.sales.total_product_cost_snapshot is 'Snapshot de quantidade multiplicada pelo custo unitário.';
comment on column public.sales.manual_shipping_amount is 'Frete conhecido da Venda Manual; nulo significa ainda não informado.';

notify pgrst, 'reload schema';

commit;
