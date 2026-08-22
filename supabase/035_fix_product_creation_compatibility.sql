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
  ) then
    raise exception 'Acesso negado';
  end if;
  if btrim(coalesce(p_name, '')) = '' or btrim(coalesce(p_unit_name, '')) = '' then
    raise exception 'Informe nome e unidade do produto.';
  end if;
  if p_initial_unit_cost is null or p_initial_unit_cost <= 0 or p_effective_from is null then
    raise exception 'Informe custo inicial e vigência válidos.';
  end if;

  insert into public.products
    (name, platform, default_sale_type, sku, short_description, unit_name, image_url,
     status, available_for_new_sales)
  values
    (btrim(p_name), 'manual', 'pad', nullif(btrim(p_sku), ''),
     nullif(btrim(p_short_description), ''), btrim(p_unit_name),
     nullif(btrim(p_image_url), ''),
     case when coalesce(p_is_active, true) then 'active' else 'paused' end,
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

revoke all on function public.create_product_with_initial_cost(text,text,text,text,text,numeric,date,boolean,uuid)
from public, anon, authenticated;
grant execute on function public.create_product_with_initial_cost(text,text,text,text,text,numeric,date,boolean,uuid)
to service_role;
