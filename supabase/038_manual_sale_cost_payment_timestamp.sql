begin;

-- Preserva o instante real dos pagamentos de custos da Venda Manual.
-- Pagamentos históricos permanecem somente com a data conhecida;
-- nenhum horário é inventado.

alter table public.manual_sale_cost_obligations
  add column if not exists paid_at_timestamp timestamptz;

comment on column public.manual_sale_cost_obligations.paid_at_timestamp is
  'Instante real informado para o pagamento. Nulo em registros históricos que possuíam apenas a data.';

drop function if exists public.register_manual_sale_cost_payment(
  uuid,
  numeric,
  date,
  uuid
);

create or replace function public.register_manual_sale_cost_payment(
  p_obligation_id uuid,
  p_confirmed_amount numeric,
  p_paid_at timestamptz,
  p_admin_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost public.manual_sale_cost_obligations%rowtype;
  v_sale public.sales%rowtype;
  v_expense_id uuid;
  v_category text;
  v_expense_date date;
begin
  if auth.role() <> 'service_role'
     and auth.uid() is distinct from p_admin_id then
    raise exception 'Acesso negado';
  end if;

  if not exists (
    select 1
    from public.user_profiles
    where id = p_admin_id
      and role = 'admin'
      and is_active = true
  ) then
    raise exception 'Acesso negado';
  end if;

  if p_paid_at is null
     or p_confirmed_amount is null
     or p_confirmed_amount <= 0 then
    raise exception 'Informe data, hora e valor válidos.';
  end if;

  select *
    into v_cost
  from public.manual_sale_cost_obligations
  where id = p_obligation_id
  for update;

  if not found then
    raise exception 'Custo a pagar não encontrado.';
  end if;

  if v_cost.status = 'paid'
     or v_cost.expense_id is not null then
    raise exception 'Este custo já foi pago.';
  end if;

  if v_cost.status <> 'pending' then
    raise exception 'Este custo não está disponível para pagamento.';
  end if;

  if round(p_confirmed_amount, 2) is distinct from v_cost.amount then
    raise exception 'O valor confirmado difere do custo pendente. Corrija o custo antes de pagar.';
  end if;

  select *
    into v_sale
  from public.sales
  where id = v_cost.sale_id;

  if not found then
    raise exception 'Venda vinculada não encontrada.';
  end if;

  if lower(coalesce(v_sale.sale_platform, '')) <> 'manual'
     or v_sale.deleted_at is not null
     or lower(coalesce(v_sale.order_status, 'active')) <> 'active' then
    raise exception 'A venda não está operacionalmente válida para pagamento deste custo.';
  end if;

  v_category :=
    case v_cost.cost_kind
      when 'product' then 'products'
      else 'shipping'
    end;

  -- Converte o instante para o dia financeiro brasileiro.
  v_expense_date :=
    (p_paid_at at time zone 'America/Sao_Paulo')::date;

  insert into public.expenses (
    description,
    category,
    amount,
    expense_date,
    source,
    notes,
    created_by
  )
  values (
    v_cost.description,
    v_category,
    v_cost.amount,
    v_expense_date,
    'Venda Manual',
    'Venda ' || v_sale.id::text ||
      ' · Cliente ' || v_sale.customer_name,
    p_admin_id
  )
  returning id into v_expense_id;

  update public.manual_sale_cost_obligations
  set
    status = 'paid',
    expense_id = v_expense_id,
    paid_at = v_expense_date,
    paid_at_timestamp = p_paid_at,
    updated_by = p_admin_id
  where id = v_cost.id;

  return jsonb_build_object(
    'obligation_id', v_cost.id,
    'expense_id', v_expense_id,
    'paid_at', p_paid_at,
    'expense_date', v_expense_date,
    'amount', v_cost.amount
  );
end;
$$;

revoke all
on function public.register_manual_sale_cost_payment(
  uuid,
  numeric,
  timestamptz,
  uuid
)
from public, anon, authenticated;

grant execute
on function public.register_manual_sale_cost_payment(
  uuid,
  numeric,
  timestamptz,
  uuid
)
to service_role;

commit;