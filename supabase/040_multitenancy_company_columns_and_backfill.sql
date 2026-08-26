begin;

-- UUID determinístico da operação atual criada pela migration 039.
do $$
declare
  v_company_id constant uuid := '00000000-0000-4000-8000-000000000001';
  v_table text;
begin
  foreach v_table in array array[
    'sales', 'leads', 'call_records', 'order_status_history',
    'cash_withdrawals', 'expenses', 'expense_tax_items', 'expense_categories',
    'guarantee_settings', 'postpaid_guarantees', 'guarantee_payment_date_corrections',
    'ad_accounts', 'campaigns', 'capital_cycle_settings', 'products',
    'product_cost_history', 'product_kits', 'manual_sale_cost_obligations',
    'coproducers', 'product_coproducer_rules', 'sale_coproducer_obligations', 'sellers'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      -- Default transitório: mantém a versão atual da aplicação escrevendo na Empresa A
      -- durante a janela entre a aplicação das migrations e o deploy tenant-aware.
      execute format('alter table public.%I add column if not exists company_id uuid default %L::uuid', v_table, v_company_id::text);
      execute format('alter table public.%I alter column company_id set default %L::uuid', v_table, v_company_id::text);
      execute format('update public.%I set company_id = $1 where company_id is null', v_table)
        using v_company_id;
      execute format('create index if not exists %I on public.%I(company_id)', v_table || '_company_id_idx', v_table);
    end if;
  end loop;
end;
$$;

-- Não prosseguir se qualquer tabela versionada ficou sem empresa.
do $$
declare
  v_table text;
  v_missing bigint;
begin
  foreach v_table in array array[
    'sales', 'leads', 'order_status_history', 'cash_withdrawals', 'expenses',
    'expense_tax_items', 'expense_categories', 'guarantee_settings',
    'postpaid_guarantees', 'guarantee_payment_date_corrections', 'ad_accounts',
    'campaigns', 'capital_cycle_settings', 'products', 'product_cost_history',
    'product_kits', 'manual_sale_cost_obligations', 'coproducers',
    'product_coproducer_rules', 'sale_coproducer_obligations', 'sellers'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('select count(*) from public.%I where company_id is null', v_table) into v_missing;
      if v_missing > 0 then
        raise exception 'A tabela % ainda possui % registros sem company_id.', v_table, v_missing;
      end if;
      execute format('alter table public.%I alter column company_id set not null', v_table);
      execute format(
        'alter table public.%I add constraint %I foreign key (company_id) references public.companies(id) on delete restrict',
        v_table,
        v_table || '_company_id_fkey'
      );
    end if;
  end loop;

  if to_regclass('public.call_records') is not null then
    execute 'alter table public.call_records alter column company_id set not null';
    execute 'alter table public.call_records add constraint call_records_company_id_fkey foreign key (company_id) references public.companies(id) on delete restrict';
  end if;
end;
$$;

commit;
