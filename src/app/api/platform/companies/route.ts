import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function slug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const admin = getSupabaseAdminClient();
  const [companies, memberships] = await Promise.all([
    admin.from("companies").select("id,name,slug,status,created_at").order("created_at", { ascending: false }),
    admin.from("company_memberships").select("company_id,user_id,role,is_active,user_profiles(full_name,email)").eq("is_active", true)
  ]);
  if (companies.error || memberships.error) return NextResponse.json({ error: companies.error?.message || memberships.error?.message }, { status: 500 });
  const rows = (companies.data ?? []).map((company) => {
    const members = (memberships.data ?? []).filter((item) => item.company_id === company.id);
    const owner = members.find((item) => item.role === "owner");
    const profile = owner ? (Array.isArray(owner.user_profiles) ? owner.user_profiles[0] : owner.user_profiles) : null;
    return {
      id: company.id, name: company.name, slug: company.slug, status: company.status,
      ownerName: profile?.full_name || "Sem proprietário", ownerEmail: profile?.email || "—",
      userCount: members.length, createdAt: company.created_at
    };
  });
  return NextResponse.json({ companies: rows });
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => ({}));
  const name = text(body.name); const ownerName = text(body.ownerName); const ownerEmail = text(body.ownerEmail).toLowerCase();
  if (!name || !ownerName || !ownerEmail.includes("@")) return NextResponse.json({ error: "Informe empresa, responsável e e-mail válidos." }, { status: 400 });
  const admin = getSupabaseAdminClient();
  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) return NextResponse.json({ error: "Não foi possível consultar os acessos existentes." }, { status: 500 });
  let owner = users.data.users.find((user) => user.email?.toLowerCase() === ownerEmail);
  if (owner) {
    const existing = await admin.from("company_memberships").select("company_id").eq("user_id", owner.id).limit(1);
    if (existing.data?.length) return NextResponse.json({ error: "Este e-mail já está vinculado a outra empresa." }, { status: 409 });
  } else {
    const invited = await admin.auth.admin.inviteUserByEmail(ownerEmail, { data: { full_name: ownerName, seller_display_name: ownerName, role: "admin" } });
    if (invited.error || !invited.data.user) return NextResponse.json({ error: invited.error?.message || "Não foi possível convidar o responsável." }, { status: 500 });
    owner = invited.data.user;
  }
  const provisioned = await admin.rpc("provision_company", {
    p_name: name, p_slug: slug(name), p_owner_id: owner.id, p_owner_email: ownerEmail,
    p_owner_name: ownerName, p_platform_admin_id: auth.user.id
  });
  if (provisioned.error) return NextResponse.json({ error: provisioned.error.message }, { status: 409 });
  return NextResponse.json({ companyId: provisioned.data, invited: !users.data.users.some((user) => user.id === owner?.id) }, { status: 201 });
}
