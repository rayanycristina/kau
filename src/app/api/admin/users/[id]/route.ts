import { NextResponse } from "next/server";
import { mapUserProfile, requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";
import type { UserRole } from "@/data/user-profile-types";

export const dynamic = "force-dynamic";

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeRole(value: unknown): UserRole | null {
  return value === "admin" || value === "seller" ? value : null;
}

function normalizeCommission(value: unknown) {
  const number = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(number) || number < 0 || number > 100) return null;
  return Math.round(number * 100) / 100;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const admin = getSupabaseAdminClient();
  const membershipResult = await admin.from("company_memberships").select("role,is_active").eq("company_id", auth.companyId).eq("user_id", id).maybeSingle();
  if (membershipResult.error || !membershipResult.data) return NextResponse.json({ error: "Usuário não encontrado nesta empresa." }, { status: 404 });
  if (membershipResult.data.role === "owner" && (body.role !== undefined || body.isActive === false)) {
    return NextResponse.json({ error: "O proprietário da empresa não pode ser removido ou desativado." }, { status: 409 });
  }

  const profilePatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const membershipPatch: Record<string, unknown> = {};

  if (body.fullName !== undefined) {
    const fullName = cleanText(body.fullName);
    if (!fullName) return NextResponse.json({ error: "Nome completo inválido." }, { status: 400 });
    profilePatch.full_name = fullName;
  }

  if (body.sellerDisplayName !== undefined) {
    const sellerDisplayName = cleanText(body.sellerDisplayName);
    if (!sellerDisplayName) return NextResponse.json({ error: "Nome de vendedor inválido." }, { status: 400 });
    profilePatch.seller_display_name = sellerDisplayName;
  }

  if (body.role !== undefined) {
    const role = normalizeRole(body.role);
    if (!role) return NextResponse.json({ error: "Role inválida." }, { status: 400 });
    profilePatch.role = role;
    membershipPatch.role = role;
  }

  if (body.commissionPercent !== undefined) {
    const commissionPercent = normalizeCommission(body.commissionPercent);
    if (commissionPercent === null) return NextResponse.json({ error: "Comissão inválida." }, { status: 400 });
    profilePatch.commission_percent = commissionPercent;
  }

  if (body.isActive !== undefined) {
    profilePatch.is_active = Boolean(body.isActive);
    membershipPatch.is_active = Boolean(body.isActive);
  }

  if (body.email !== undefined) {
    const email = cleanText(body.email)?.toLowerCase();
    if (!email) return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    profilePatch.email = email;
    const { error: emailError } = await admin.auth.admin.updateUserById(id, { email });
    if (emailError) return NextResponse.json({ error: emailError.message }, { status: 500 });
  }

  if (body.password) {
    const password = cleanText(body.password);
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres." }, { status: 400 });
    }
    const { error: passwordError } = await admin.auth.admin.updateUserById(id, { password });
    if (passwordError) return NextResponse.json({ error: passwordError.message }, { status: 500 });
  }

  if (Object.keys(profilePatch).length <= 1) {
    return NextResponse.json({ error: "Nenhuma alteração enviada." }, { status: 400 });
  }

  const { data, error } = await admin.from("user_profiles").update(profilePatch).eq("id", id).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Object.keys(membershipPatch).length) {
    const membershipUpdate = await admin.from("company_memberships").update(membershipPatch).eq("company_id", auth.companyId).eq("user_id", id);
    if (membershipUpdate.error) return NextResponse.json({ error: "O perfil foi atualizado, mas o acesso empresarial não pôde ser sincronizado." }, { status: 500 });
  }

  if (profilePatch.is_active === false) {
    await admin.auth.admin.signOut(id, "global");
  }

  const mapped = mapUserProfile(data);
  mapped.company = auth.company;
  mapped.companyRole = body.role ?? membershipResult.data.role;
  return NextResponse.json({ user: mapped });
}
