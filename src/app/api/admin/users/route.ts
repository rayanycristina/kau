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
  if (!Number.isFinite(number) || number < 0 || number > 100) return 5;
  return Math.round(number * 100) / 100;
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  }

  const admin = getSupabaseAdminClient();
  const membershipResult = await admin
    .from("company_memberships")
    .select("user_id,role,is_active,user_profiles(*)")
    .eq("company_id", auth.companyId)
    .order("created_at", { ascending: false });

  if (membershipResult.error) {
    return NextResponse.json({ error: membershipResult.error.message }, { status: 500 });
  }

  const users = (membershipResult.data ?? []).flatMap((row) => {
    const relation = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
    if (!relation) return [];
    const profile = mapUserProfile(relation);
    profile.company = auth.company;
    profile.companyRole = row.role;
    profile.role = row.role === "seller" || row.role === "member" ? "seller" : "admin";
    profile.isActive = Boolean(row.is_active) && profile.isActive;
    return [profile];
  });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const email = cleanText(body.email)?.toLowerCase();
  const password = cleanText(body.password);
  const fullName = cleanText(body.fullName);
  const sellerDisplayName = cleanText(body.sellerDisplayName);
  const role = normalizeRole(body.role) ?? "seller";
  const commissionPercent = normalizeCommission(body.commissionPercent);

  if (!email) return NextResponse.json({ error: "Informe o e-mail." }, { status: 400 });
  if (!password || password.length < 6) return NextResponse.json({ error: "Informe uma senha com pelo menos 6 caracteres." }, { status: 400 });
  if (!fullName) return NextResponse.json({ error: "Informe o nome completo." }, { status: 400 });
  if (!sellerDisplayName) return NextResponse.json({ error: "Informe o nome de vendedor." }, { status: 400 });

  const admin = getSupabaseAdminClient();

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      seller_display_name: sellerDisplayName,
      role,
      commission_percent: String(commissionPercent)
    }
  });

  if (createError || !createdUser.user) {
    return NextResponse.json({ error: createError?.message || "Não foi possível criar o usuário." }, { status: 500 });
  }

  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .upsert({
      id: createdUser.user.id,
      email,
      full_name: fullName,
      seller_display_name: sellerDisplayName,
      role,
      commission_percent: commissionPercent,
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message || "Usuário criado, mas o perfil não foi salvo." }, { status: 500 });
  }

  const membershipResult = await admin.from("company_memberships").insert({
    company_id: auth.companyId,
    user_id: createdUser.user.id,
    role,
    is_active: true
  });
  if (membershipResult.error) {
    await admin.auth.admin.deleteUser(createdUser.user.id);
    return NextResponse.json({ error: membershipResult.error.message }, { status: 409 });
  }

  const mapped = mapUserProfile(profile);
  mapped.company = auth.company;
  mapped.companyRole = role;
  return NextResponse.json({ user: mapped }, { status: 201 });
}
