begin;

do $$
declare
  v_sale public.sales%rowtype;
  v_owner public.sellers%rowtype;
  v_commission_amount_is_generated boolean;
begin
  select *
    into v_owner
    from public.sellers
   where id = '153285d0-8419-40e9-8818-6b6f29834e94'::uuid
   for update;

  if not found then
    raise exception 'Migration 027 interrompida: cadastro da dona não encontrado.';
  end if;

  if v_owner.user_id is distinct from '2cfd619b-b78d-4da0-9ec1-6484331d5978'::uuid
     or v_owner.is_owner is distinct from true
     or v_owner.status is distinct from 'active'
     or v_owner.commission_percent is distinct from 0::numeric then
    raise exception 'Migration 027 interrompida: cadastro da dona não corresponde ao vínculo ativo e à comissão zero aprovados.';
  end if;

  select *
    into v_sale
    from public.sales
   where id = 'a0b48c71-7f36-494f-a9a4-2c158aee574d'::uuid
   for update;

  if not found then
    raise exception 'Migration 027 interrompida: venda alvo não encontrada.';
  end if;

  if v_sale.seller_id is not null
     or btrim(v_sale.seller_name) is distinct from 'Rayany Cristina'
     or v_sale.total_amount is distinct from 497.90::numeric
     or v_sale.operation_commission_amount is not null
     or v_sale.operation_commission_percent is distinct from 50.8817::numeric
     or v_sale.commission_rate is distinct from 50.88::numeric
     or v_sale.commission_amount is distinct from 253.33::numeric then
    raise exception 'Migration 027 interrompida: a venda alvo não está no estado histórico esperado; nenhuma alteração foi aplicada.';
  end if;

  select (is_generated = 'ALWAYS')
    into v_commission_amount_is_generated
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'sales'
     and column_name = 'commission_amount';

  if v_commission_amount_is_generated is null then
    raise exception 'Migration 027 interrompida: coluna public.sales.commission_amount não encontrada.';
  end if;

  update public.sales
     set seller_id = v_owner.id,
         operation_commission_amount = 253.34,
         operation_commission_percent = 50.8817,
         commission_rate = 0
   where id = v_sale.id;

  if not v_commission_amount_is_generated then
    update public.sales
       set commission_amount = 0
     where id = v_sale.id;
  end if;

  select *
    into v_sale
    from public.sales
   where id = 'a0b48c71-7f36-494f-a9a4-2c158aee574d'::uuid;

  if v_sale.seller_id is distinct from v_owner.id
     or v_sale.operation_commission_amount is distinct from 253.34::numeric
     or v_sale.operation_commission_percent is distinct from 50.8817::numeric
     or v_sale.commission_rate is distinct from 0::numeric
     or v_sale.commission_amount is distinct from 0::numeric then
    raise exception 'Migration 027 interrompida: validação final da separação de comissões falhou.';
  end if;
end
$$;

commit;
