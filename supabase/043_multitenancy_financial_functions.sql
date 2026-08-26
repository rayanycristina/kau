begin;

-- Pré-requisito da RPC de pagamento com data/hora; não recria nem aplica a 038.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'manual_sale_cost_obligations'
      and column_name = 'paid_at_timestamp'
      and data_type = 'timestamp with time zone'
  ) then
    raise exception 'Migration 043 bloqueada: aplique previamente a migration 038_manual_sale_cost_payment_timestamp.sql. A coluna public.manual_sale_cost_obligations.paid_at_timestamp (timestamptz) é obrigatória.';
  end if;
end;
$$; 

create or replace function public.is_company_admin_as(p_user_id uuid, p_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.company_memberships membership
    join public.companies company on company.id = membership.company_id
    where membership.user_id = p_user_id
      and membership.company_id = p_company_id
      and membership.role in ('owner', 'admin')
      and membership.is_active = true
      and company.status = 'active'
  );
$$;
revoke all on function public.is_company_admin_as(uuid,uuid) from public, anon, authenticated;
grant execute on function public.is_company_admin_as(uuid,uuid) to service_role;

create or replace function public.sync_postpaid_guarantee()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_eligible boolean;
  v_amount numeric(12,2);
begin
  if (new.created_at at time zone 'UTC')::date < date '2026-07-01' then return new; end if;
  v_eligible := lower(coalesce(new.sale_platform,'')) = 'coinzz'
    and (upper(coalesce(new.payment_method,'')) = 'PAD' or upper(coalesce(new.delivery_type,'')) like 'PAD%')
    and public.is_guarantee_sale_financially_valid(new.order_status);
  if v_eligible then
    select default_amount into v_amount
    from public.guarantee_settings
    where company_id = new.company_id and lower(platform) = 'coinzz' and upper(payment_mode) = 'PAD'
      and is_active and effective_from <= current_date
    order by effective_from desc limit 1;
    if v_amount is not null then
      insert into public.postpaid_guarantees
        (company_id,sale_id,guarantee_type,guarantee_amount,is_active,created_by,updated_by)
      values (new.company_id,new.id,'conditional',v_amount,true,auth.uid(),auth.uid())
      on conflict (sale_id) do update set is_active=true, updated_by=auth.uid()
      where postpaid_guarantees.company_id = new.company_id and postpaid_guarantees.paid_at is null;
    end if;
  else
    update public.postpaid_guarantees set is_active=false, updated_by=auth.uid()
    where company_id=new.company_id and sale_id=new.id and paid_at is null;
  end if;
  return new;
end;
$$;

create or replace function public.register_guarantee_payment(
  p_guarantee_id uuid, p_paid_amount numeric, p_paid_at date, p_notes text default null,
  p_admin_id uuid default auth.uid()
) returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.postpaid_guarantees%rowtype; s public.sales%rowtype; v_expense_id uuid;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_admin_id then raise exception 'Acesso negado'; end if;
  if p_paid_amount is null or p_paid_amount <= 0 or p_paid_at is null then raise exception 'Pagamento inválido'; end if;
  select * into g from public.postpaid_guarantees where id=p_guarantee_id for update;
  if not found then raise exception 'Garantia não encontrada'; end if;
  if not public.is_company_admin_as(p_admin_id,g.company_id) then raise exception 'Acesso negado'; end if;
  if g.paid_at is not null or g.expense_id is not null then raise exception 'Garantia já paga'; end if;
  select * into s from public.sales where company_id=g.company_id and id=g.sale_id;
  if not found then raise exception 'Venda vinculada não encontrada'; end if;
  if not g.is_active then raise exception 'Garantia inativa'; end if;
  if not public.is_guarantee_sale_financially_valid(s.order_status) then raise exception 'Venda financeiramente inválida'; end if;
  if g.guarantee_type='conditional' and public.is_guarantee_customer_payment_confirmed(s.payment_status) then
    raise exception 'Garantia liberada: o cliente já possui pagamento confirmado.';
  end if;
  insert into public.expenses(company_id,description,category,amount,expense_date,source,notes,created_by)
  values (g.company_id,'Garantia Coinzz — '||s.customer_name,'guarantees',round(p_paid_amount,2),p_paid_at,'Coinzz',
    concat('Pedido ',left(s.id::text,8),' · Venda ',s.id::text,case when p_notes is not null then ' · '||p_notes else '' end),p_admin_id)
  returning id into v_expense_id;
  update public.postpaid_guarantees set paid_amount=round(p_paid_amount,2),paid_at=p_paid_at,expense_id=v_expense_id,
    notes=coalesce(p_notes,notes),updated_by=p_admin_id,reversed_by=null,reversed_at=null
  where company_id=g.company_id and id=g.id;
  return jsonb_build_object('guarantee_id',g.id,'expense_id',v_expense_id);
end;
$$;

create or replace function public.reverse_guarantee_payment(p_guarantee_id uuid,p_admin_id uuid default auth.uid())
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.postpaid_guarantees%rowtype; v_expense_id uuid;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_admin_id then raise exception 'Acesso negado'; end if;
  select * into g from public.postpaid_guarantees where id=p_guarantee_id for update;
  if not found then raise exception 'Garantia não encontrada'; end if;
  if not public.is_company_admin_as(p_admin_id,g.company_id) then raise exception 'Acesso negado'; end if;
  if g.paid_at is null or g.expense_id is null then raise exception 'Garantia sem pagamento'; end if;
  v_expense_id := g.expense_id;
  update public.postpaid_guarantees set paid_amount=null,paid_at=null,expense_id=null,updated_by=p_admin_id,
    reversed_by=p_admin_id,reversed_at=now() where company_id=g.company_id and id=g.id;
  delete from public.expenses where company_id=g.company_id and id=v_expense_id;
  return jsonb_build_object('guarantee_id',g.id,'reversed_expense_id',v_expense_id);
end;
$$;

create or replace function public.correct_guarantee_payment_date(p_guarantee_id uuid,p_new_paid_at date,p_admin_id uuid default auth.uid())
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.postpaid_guarantees%rowtype;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_admin_id then raise exception 'Acesso negado'; end if;
  if p_new_paid_at is null then raise exception 'Data de pagamento inválida'; end if;
  select * into g from public.postpaid_guarantees where id=p_guarantee_id for update;
  if not found then raise exception 'Garantia não encontrada'; end if;
  if not public.is_company_admin_as(p_admin_id,g.company_id) then raise exception 'Acesso negado'; end if;
  if g.paid_at is null or g.expense_id is null or g.paid_amount is null then raise exception 'Garantia sem pagamento'; end if;
  if g.paid_at = p_new_paid_at then
    return jsonb_build_object('guarantee_id',g.id,'expense_id',g.expense_id,'previous_paid_at',g.paid_at,'new_paid_at',p_new_paid_at,'changed',false);
  end if;
  update public.expenses set expense_date=p_new_paid_at,updated_at=now() where company_id=g.company_id and id=g.expense_id;
  update public.postpaid_guarantees set paid_at=p_new_paid_at,updated_by=p_admin_id where company_id=g.company_id and id=g.id;
  insert into public.guarantee_payment_date_corrections
    (company_id,guarantee_id,expense_id,previous_paid_at,new_paid_at,corrected_by)
  values (g.company_id,g.id,g.expense_id,g.paid_at,p_new_paid_at,p_admin_id);
  return jsonb_build_object('guarantee_id',g.id,'expense_id',g.expense_id,'previous_paid_at',g.paid_at,'new_paid_at',p_new_paid_at,'changed',true);
end;
$$;

create or replace function public.create_product_with_initial_cost(
  p_name text,p_sku text,p_short_description text,p_unit_name text,p_image_url text,
  p_initial_unit_cost numeric,p_effective_from date,p_is_active boolean,p_admin_id uuid default auth.uid()
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_company_id uuid; v_product_id uuid; v_cost_id uuid;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_admin_id then raise exception 'Acesso negado'; end if;
  select company_id into v_company_id from public.company_memberships
  where user_id=p_admin_id and is_active=true and role in ('owner','admin');
  if v_company_id is null or not public.is_company_admin_as(p_admin_id,v_company_id) then raise exception 'Acesso negado'; end if;
  if btrim(coalesce(p_name,''))='' or btrim(coalesce(p_unit_name,''))='' then raise exception 'Informe nome e unidade do produto.'; end if;
  if p_initial_unit_cost is null or p_initial_unit_cost<=0 or p_effective_from is null then raise exception 'Informe custo inicial e vigência válidos.'; end if;
  insert into public.products(company_id,name,platform,default_sale_type,sku,short_description,unit_name,image_url,status,available_for_new_sales)
  values (v_company_id,btrim(p_name),'manual','pad',nullif(btrim(p_sku),''),nullif(btrim(p_short_description),''),btrim(p_unit_name),
    nullif(btrim(p_image_url),''),case when coalesce(p_is_active,true) then 'active' else 'paused' end,coalesce(p_is_active,true))
  returning id into v_product_id;
  insert into public.product_cost_history(company_id,product_id,unit_cost,effective_from,created_by)
  values (v_company_id,v_product_id,round(p_initial_unit_cost,2),p_effective_from,p_admin_id) returning id into v_cost_id;
  return jsonb_build_object('product_id',v_product_id,'cost_id',v_cost_id);
end;
$$;

create or replace function public.add_product_cost(p_product_id uuid,p_unit_cost numeric,p_effective_from date,p_admin_id uuid default auth.uid())
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_company_id uuid; v_cost_id uuid;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_admin_id then raise exception 'Acesso negado'; end if;
  select company_id into v_company_id from public.products where id=p_product_id for update;
  if v_company_id is null then raise exception 'Produto não encontrado.'; end if;
  if not public.is_company_admin_as(p_admin_id,v_company_id) then raise exception 'Acesso negado'; end if;
  if p_unit_cost is null or p_unit_cost<=0 or p_effective_from is null then raise exception 'Informe custo e vigência válidos.'; end if;
  insert into public.product_cost_history(company_id,product_id,unit_cost,effective_from,created_by)
  values(v_company_id,p_product_id,round(p_unit_cost,2),p_effective_from,p_admin_id) returning id into v_cost_id;
  return jsonb_build_object('product_id',p_product_id,'cost_id',v_cost_id);
end;
$$;

create or replace function public.register_manual_sale_cost_payment(
  p_obligation_id uuid,p_confirmed_amount numeric,p_paid_at timestamptz,p_admin_id uuid default auth.uid()
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_cost public.manual_sale_cost_obligations%rowtype; v_sale public.sales%rowtype; v_expense_id uuid; v_category text; v_date date;
begin
  if auth.role()<>'service_role' and auth.uid() is distinct from p_admin_id then raise exception 'Acesso negado'; end if;
  select * into v_cost from public.manual_sale_cost_obligations where id=p_obligation_id for update;
  if not found then raise exception 'Custo a pagar não encontrado.'; end if;
  if not public.is_company_admin_as(p_admin_id,v_cost.company_id) then raise exception 'Acesso negado'; end if;
  if p_paid_at is null or p_confirmed_amount is null or p_confirmed_amount<=0 then raise exception 'Informe data, hora e valor válidos.'; end if;
  if v_cost.status='paid' or v_cost.expense_id is not null then raise exception 'Este custo já foi pago.'; end if;
  if v_cost.status<>'pending' then raise exception 'Este custo não está disponível para pagamento.'; end if;
  if round(p_confirmed_amount,2) is distinct from v_cost.amount then raise exception 'O valor confirmado difere do custo pendente. Corrija o custo antes de pagar.'; end if;
  select * into v_sale from public.sales where company_id=v_cost.company_id and id=v_cost.sale_id;
  if not found or lower(coalesce(v_sale.sale_platform,''))<>'manual' or v_sale.deleted_at is not null or lower(coalesce(v_sale.order_status,'active'))<>'active'
    then raise exception 'A venda não está operacionalmente válida para pagamento deste custo.'; end if;
  v_category:=case v_cost.cost_kind when 'product' then 'products' else 'shipping' end;
  v_date:=(p_paid_at at time zone 'America/Sao_Paulo')::date;
  insert into public.expenses(company_id,description,category,amount,expense_date,source,notes,created_by)
  values(v_cost.company_id,v_cost.description,v_category,v_cost.amount,v_date,'Venda Manual','Venda '||v_sale.id::text||' · Cliente '||v_sale.customer_name,p_admin_id)
  returning id into v_expense_id;
  update public.manual_sale_cost_obligations set status='paid',expense_id=v_expense_id,paid_at=v_date,paid_at_timestamp=p_paid_at,updated_by=p_admin_id
  where company_id=v_cost.company_id and id=v_cost.id;
  return jsonb_build_object('obligation_id',v_cost.id,'expense_id',v_expense_id,'paid_at',p_paid_at,'expense_date',v_date,'amount',v_cost.amount);
end;
$$;


revoke all on function public.register_guarantee_payment(uuid,numeric,date,text,uuid) from public,anon,authenticated;
revoke all on function public.reverse_guarantee_payment(uuid,uuid) from public,anon,authenticated;
revoke all on function public.correct_guarantee_payment_date(uuid,date,uuid) from public,anon,authenticated;
revoke all on function public.create_product_with_initial_cost(text,text,text,text,text,numeric,date,boolean,uuid) from public,anon,authenticated;
revoke all on function public.add_product_cost(uuid,numeric,date,uuid) from public,anon,authenticated;
revoke all on function public.register_manual_sale_cost_payment(uuid,numeric,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.register_guarantee_payment(uuid,numeric,date,text,uuid) to service_role;
grant execute on function public.reverse_guarantee_payment(uuid,uuid) to service_role;
grant execute on function public.correct_guarantee_payment_date(uuid,date,uuid) to service_role;
grant execute on function public.create_product_with_initial_cost(text,text,text,text,text,numeric,date,boolean,uuid) to service_role;
grant execute on function public.add_product_cost(uuid,numeric,date,uuid) to service_role;
grant execute on function public.register_manual_sale_cost_payment(uuid,numeric,timestamptz,uuid) to service_role;

-- Tabelas filhas herdam a empresa do pai também quando criadas por triggers legados.
create or replace function public.inherit_company_from_parent()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_parent_id uuid;
  v_company_id uuid;
  v_payload jsonb;
begin
  v_payload := to_jsonb(new);
  v_parent_id := nullif(v_payload ->> tg_argv[1], '')::uuid;
  if v_parent_id is null then return new; end if;
  execute format('select company_id from public.%I where id = $1', tg_argv[0])
    into v_company_id using v_parent_id;
  if v_company_id is null then raise exception 'Entidade pai não encontrada.'; end if;
  if new.company_id is not null and new.company_id is distinct from v_company_id then
    raise exception 'Relacionamento entre empresas diferentes não permitido.';
  end if;
  new.company_id := v_company_id;
  return new;
end;
$$;

-- order_status_history não existe no schema real atual; não criar trigger para tabela ausente.
create trigger expense_tax_inherit_company before insert or update on public.expense_tax_items
for each row execute function public.inherit_company_from_parent('expenses','expense_id');
create trigger guarantee_inherit_company before insert or update on public.postpaid_guarantees
for each row execute function public.inherit_company_from_parent('sales','sale_id');
create trigger guarantee_correction_inherit_company before insert or update on public.guarantee_payment_date_corrections
for each row execute function public.inherit_company_from_parent('postpaid_guarantees','guarantee_id');
create trigger product_cost_inherit_company before insert or update on public.product_cost_history
for each row execute function public.inherit_company_from_parent('products','product_id');
create trigger product_kit_inherit_company before insert or update on public.product_kits
for each row execute function public.inherit_company_from_parent('products','product_id');
create trigger manual_cost_inherit_company before insert or update on public.manual_sale_cost_obligations
for each row execute function public.inherit_company_from_parent('sales','sale_id');
-- Estruturas de coprodução não existem no schema real atual; triggers ficam para migration futura.

-- O array legado continua disponível para compatibilidade, mas somente IDs da mesma
-- empresa são aceitos e a relação normalizada é mantida automaticamente.
create or replace function public.sync_cash_withdrawal_sales()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_sale_id_text text;
begin
  foreach v_sale_id_text in array coalesce(new.sale_ids, array[]::text[])
  loop
    if not exists (
      select 1 from public.sales
      where company_id=new.company_id and id::text=v_sale_id_text
    ) then
      raise exception 'Venda do saque não pertence à empresa atual.';
    end if;
  end loop;

  delete from public.cash_withdrawal_sales
  where company_id=new.company_id and withdrawal_id=new.id;

  insert into public.cash_withdrawal_sales(company_id,withdrawal_id,sale_id)
  select new.company_id,new.id,sale.id
  from unnest(coalesce(new.sale_ids,array[]::text[])) raw_id
  join public.sales sale
    on sale.company_id=new.company_id and sale.id::text=raw_id
  on conflict do nothing;
  return new;
end;
$$;

create trigger cash_withdrawals_sync_sales
after insert or update of sale_ids,company_id on public.cash_withdrawals
for each row execute function public.sync_cash_withdrawal_sales();

commit;
