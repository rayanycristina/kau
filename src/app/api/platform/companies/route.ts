import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { requirePlatformAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const PASSWORD_ERROR = "A senha temporária deve ter pelo menos 8 caracteres, com letra e número.";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function slug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validTemporaryPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

async function findAuthUserByEmail(admin: ReturnType<typeof getSupabaseAdminClient>, email: string) {
  let page = 1;
  do {
    const result = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw result.error;
    const found = result.data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found;
    if (!result.data.nextPage) return null;
    page = result.data.nextPage;
  } while (true);
}

async function existingAccessResponse(admin: ReturnType<typeof getSupabaseAdminClient>, owner: User) {
  const membership = await admin.from("company_memberships").select("company_id").eq("user_id", owner.id).limit(1);
  if (membership.error) {
    return NextResponse.json({ error: "Não foi possível verificar os vínculos existentes deste acesso." }, { status: 500 });
  }
  if (membership.data.length) {
    return NextResponse.json({ error: "Este e-mail já está vinculado a outra empresa." }, { status: 409 });
  }
  return NextResponse.json(
    { error: "Este e-mail já possui um acesso no sistema. Use outro e-mail ou redefina o acesso existente." },
    { status: 409 }
  );
}

export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const admin = getSupabaseAdminClient();
  const [companies, memberships] = await Promise.all([
    admin.from("companies").select("id,name,slug,status,created_at").order("created_at", { ascending: false }),
    admin.from("company_memberships").select("company_id,user_id,role,is_active,user_profiles(full_name,email)").eq("is_active", true)
  ]);
  if (companies.error || memberships.error) {
    return NextResponse.json({ error: companies.error?.message || memberships.error?.message }, { status: 500 });
  }
  const rows = (companies.data ?? []).map((company) => {
    const members = (memberships.data ?? []).filter((item) => item.company_id === company.id);
    const owner = members.find((item) => item.role === "owner");
    const profile = owner ? (Array.isArray(owner.user_profiles) ? owner.user_profiles[0] : owner.user_profiles) : null;
    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      status: company.status,
      ownerName: profile?.full_name || "Sem proprietário",
      ownerEmail: profile?.email || "—",
      userCount: members.length,
      createdAt: company.created_at
    };
  });
  return NextResponse.json({ companies: rows });
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => ({}));
  const name = text(body.name);
  const ownerName = text(body.ownerName);
  const ownerEmail = text(body.ownerEmail).toLowerCase();
  const ownerPassword = typeof body.ownerPassword === "string" ? body.ownerPassword : "";
  const companySlug = slug(name);

  if (!name || !companySlug || !ownerName || !validEmail(ownerEmail)) {
    return NextResponse.json({ error: "Informe empresa, responsável e e-mail válidos." }, { status: 400 });
  }
  if (!validTemporaryPassword(ownerPassword)) {
    return NextResponse.json({ error: PASSWORD_ERROR }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const companyCollision = await admin.from("companies").select("id").eq("slug", companySlug).maybeSingle();
  if (companyCollision.error) {
    return NextResponse.json({ error: "Não foi possível validar o identificador da empresa." }, { status: 500 });
  }
  if (companyCollision.data) {
    return NextResponse.json({ error: "Já existe uma empresa com este identificador. Altere o nome da empresa." }, { status: 409 });
  }

  let existingOwner: User | null;
  try {
    existingOwner = await findAuthUserByEmail(admin, ownerEmail);
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar os acessos existentes." }, { status: 500 });
  }
  if (existingOwner) return existingAccessResponse(admin, existingOwner);

  const created = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
    user_metadata: { full_name: ownerName, seller_display_name: ownerName, role: "admin" }
  });

  if (created.error || !created.data.user) {
    // Trata também uma colisão criada entre a consulta e o createUser.
    try {
      const collidedOwner = await findAuthUserByEmail(admin, ownerEmail);
      if (collidedOwner) return existingAccessResponse(admin, collidedOwner);
    } catch {
      // Retorna a mensagem segura abaixo sem expor credenciais ou detalhes internos.
    }
    return NextResponse.json({ error: "Não foi possível criar o acesso do responsável." }, { status: 500 });
  }

  const owner = created.data.user;
  const provisioned = await admin.rpc("provision_company", {
    p_name: name,
    p_slug: companySlug,
    p_owner_id: owner.id,
    p_owner_email: ownerEmail,
    p_owner_name: ownerName,
    p_platform_admin_id: auth.user.id
  });

  if (provisioned.error) {
    const rollback = await admin.auth.admin.deleteUser(owner.id);
    if (rollback.error) {
      return NextResponse.json(
        { error: "Não foi possível criar a empresa e o acesso temporário não pôde ser removido automaticamente." },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Não foi possível criar a empresa. O acesso temporário foi removido com segurança." },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { companyId: provisioned.data, message: "Empresa e acesso criados com sucesso." },
    { status: 201 }
  );
}
