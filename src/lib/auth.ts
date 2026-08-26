import { NextResponse } from "next/server";
import type { CompanyMembership, CompanyRole, CompanySummary, UserProfile, UserRole } from "@/data/user-profile-types";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  seller_display_name: string;
  role: UserRole;
  commission_percent: number | string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export function mapUserProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    sellerDisplayName: row.seller_display_name,
    role: row.role,
    commissionPercent: Number(row.commission_percent || 0),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function isAdmin(profile: UserProfile) {
  return (profile.companyRole === "owner" || profile.companyRole === "admin") && profile.isActive;
}

export function isSeller(profile: UserProfile) {
  return (profile.companyRole === "seller" || profile.companyRole === "member") && profile.isActive;
}

export function unauthorizedResponse(message = "Não autenticado.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Acesso negado.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: unauthorizedResponse() } as const;
  }

  const admin = getSupabaseAdminClient();
  const [{ data, error }, membershipResult, platformAdminResult] = await Promise.all([
    admin.from("user_profiles").select("*").eq("id", user.id).maybeSingle(),
    admin
      .from("company_memberships")
      .select("company_id,user_id,role,is_active,companies(id,name,slug,status)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(2),
    admin.from("platform_admins").select("user_id,is_active").eq("user_id", user.id).eq("is_active", true).maybeSingle()
  ]);

  if (error || !data) {
    return { error: forbiddenResponse("Perfil de usuário não encontrado.") } as const;
  }

  const profile = mapUserProfile(data as ProfileRow);

  if (!profile.isActive) {
    return { error: forbiddenResponse("Usuário desativado.") } as const;
  }

  if (membershipResult.error) {
    return { error: forbiddenResponse("Não foi possível validar a empresa do usuário.") } as const;
  }

  const memberships = membershipResult.data ?? [];
  if (memberships.length !== 1) {
    return { error: forbiddenResponse(memberships.length ? "O usuário possui mais de uma empresa ativa." : "Usuário sem empresa ativa.") } as const;
  }

  const row = memberships[0] as unknown as {
    company_id: string;
    user_id: string;
    role: CompanyRole;
    is_active: boolean;
    companies: CompanySummary | CompanySummary[] | null;
  };
  const company = (Array.isArray(row.companies) ? row.companies[0] : row.companies) as CompanySummary | null;
  if (!company || company.status !== "active") {
    return { error: forbiddenResponse("Empresa suspensa ou indisponível.") } as const;
  }

  const membership: CompanyMembership = {
    companyId: row.company_id,
    userId: row.user_id,
    role: row.role,
    isActive: row.is_active
  };
  const isPlatformAdmin = Boolean(platformAdminResult.data?.is_active);
  profile.company = company;
  profile.companyRole = membership.role;
  profile.isPlatformAdmin = isPlatformAdmin;
  profile.role = membership.role === "seller" || membership.role === "member" ? "seller" : "admin";

  return { user, profile, membership, company, companyId: company.id, companyRole: membership.role, isPlatformAdmin } as const;
}

export async function requireCompanyAdmin() {
  const auth = await requireAuth();
  if ("error" in auth) return auth;
  if (!isAdmin(auth.profile)) {
    return { error: forbiddenResponse("Somente administradores podem executar esta ação.") };
  }
  return auth;
}

export const requireAdmin = requireCompanyAdmin;

export async function requirePlatformAdmin() {
  const auth = await requireAuth();
  if ("error" in auth) return auth;
  if (!auth.isPlatformAdmin) {
    return { error: forbiddenResponse("Somente administradores da plataforma podem executar esta ação.") };
  }
  return auth;
}

export function sellerNameMatches(profile: UserProfile, sellerName?: string | null) {
  return String(sellerName || "") === profile.sellerDisplayName;
}

export function applySellerScopeToBody<T extends { sellerName?: string }>(profile: UserProfile, body: T): T {
  if (isAdmin(profile)) return body;
  return { ...body, sellerName: profile.sellerDisplayName };
}
