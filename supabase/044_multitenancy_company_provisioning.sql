begin;

create or replace function public.provision_company(
  p_name text,
  p_slug text,
  p_owner_id uuid,
  p_owner_email text,
  p_owner_name text,
  p_platform_admin_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if not exists (
    select 1
    from public.platform_admins
    where user_id = p_platform_admin_id
      and is_active = true
  ) then
    raise exception 'Acesso de plataforma negado.';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = p_owner_id
      and lower(email) = lower(p_owner_email)
  ) then
    raise exception 'Usuário proprietário não encontrado no Supabase Auth.';
  end if;

  if exists (
    select 1
    from public.company_memberships
    where user_id = p_owner_id
  ) then
    raise exception 'Este usuário já pertence ou pertenceu a outra empresa.';
  end if;

  if btrim(coalesce(p_name,'')) = ''
     or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Nome ou identificador da empresa inválido.';
  end if;

  insert into public.companies(name, slug, status)
  values (btrim(p_name), p_slug, 'active')
  returning id into v_company_id;

  insert into public.user_profiles(
    id,
    email,
    full_name,
    seller_display_name,
    role,
    commission_percent,
    is_active,
    updated_at
  )
  values (
    p_owner_id,
    lower(p_owner_email),
    btrim(p_owner_name),
    btrim(p_owner_name),
    'admin',
    0,
    true,
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    seller_display_name = excluded.seller_display_name,
    role = 'admin',
    commission_percent = 0,
    is_active = true,
    updated_at = now();

  insert into public.company_memberships(company_id, user_id, role, is_active)
  values (v_company_id, p_owner_id, 'owner', true);

  -- O owner precisa existir no cadastro operacional para conseguir lançar vendas,
  -- sem copiar qualquer vendedor da operação atual.
  insert into public.sellers(
    company_id,
    user_id,
    full_name,
    display_name,
    email,
    commission_percent,
    status,
    is_owner
  )
  values (
    v_company_id,
    p_owner_id,
    btrim(p_owner_name),
    btrim(p_owner_name),
    lower(p_owner_email),
    0,
    'active',
    true
  );

  insert into public.expense_categories(company_id, name, slug, is_system, is_active)
  values
    (v_company_id, 'Tráfego', 'traffic', true, true),
    (v_company_id, 'Ferramentas', 'tools', true, true),
    (v_company_id, 'Equipe', 'team', true, true),
    (v_company_id, 'Impostos', 'taxes', true, true),
    (v_company_id, 'Garantias', 'guarantees', true, true),
    (v_company_id, 'Outros', 'other', true, true),
    (v_company_id, 'Produtos / Fábrica', 'products', true, true),
    (v_company_id, 'Frete / Logística', 'shipping', true, true),
    (v_company_id, 'Coprodutores', 'coproducers', true, true);

  -- Garantias e ciclo de capital dependem da configuração comercial de cada empresa.
  -- Não copiar nem provisionar automaticamente regras da Empresa A.
  -- capital_cycle_settings não existe no schema real atual, portanto nenhuma linha
  -- é criada aqui para essa estrutura.

  return v_company_id;
end;
$$;

revoke all on function public.provision_company(text,text,uuid,text,text,uuid)
from public, anon, authenticated;

grant execute on function public.provision_company(text,text,uuid,text,text,uuid)
to service_role;

commit;
