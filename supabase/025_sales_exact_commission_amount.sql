-- KAU - dados comerciais explícitos e comissão líquida exata da operação
-- Migration aditiva. Não converte nem altera registros existentes.

alter table public.sales
  add column if not exists state text,
  add column if not exists kit_quantity integer,
  add column if not exists bottle_quantity integer,
  add column if not exists operation_commission_amount numeric(14,2),
  add column if not exists operation_commission_percent numeric(9,4);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sales'::regclass
      and conname = 'sales_state_check'
  ) then
    alter table public.sales
      add constraint sales_state_check
      check (state is null or state ~ '^[A-Z]{2}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sales'::regclass
      and conname = 'sales_kit_quantity_check'
  ) then
    alter table public.sales
      add constraint sales_kit_quantity_check
      check (kit_quantity is null or kit_quantity > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sales'::regclass
      and conname = 'sales_bottle_quantity_check'
  ) then
    alter table public.sales
      add constraint sales_bottle_quantity_check
      check (bottle_quantity is null or bottle_quantity > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sales'::regclass
      and conname = 'sales_operation_commission_amount_check'
  ) then
    alter table public.sales
      add constraint sales_operation_commission_amount_check
      check (operation_commission_amount is null or operation_commission_amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sales'::regclass
      and conname = 'sales_operation_commission_percent_check'
  ) then
    alter table public.sales
      add constraint sales_operation_commission_percent_check
      check (operation_commission_percent is null or operation_commission_percent between 0 and 100);
  end if;
end
$$;

comment on column public.sales.state is
  'UF informada explicitamente. O valor legado de city não é convertido automaticamente.';
comment on column public.sales.kit_quantity is
  'Quantidade de kits informada explicitamente. Nullable para preservar registros históricos.';
comment on column public.sales.bottle_quantity is
  'Quantidade de frascos informada explicitamente. Nullable para preservar registros históricos.';
comment on column public.sales.operation_commission_amount is
  'Valor líquido exato recebido pela operação/plataforma. Tem prioridade sobre percentuais.';
comment on column public.sales.operation_commission_percent is
  'Percentual efetivo derivado do valor líquido exato no momento do lançamento.';
