import { NextResponse } from "next/server";
import type { UserProfile, UserRole } from "@/data/user-profile-types";
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
  return profile.role === "admin" && profile.isActive;
}

export function isSeller(profile: UserProfile) {
  return profile.role === "seller" && profile.isActive;
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
  const { data, error } = await admin.from("user_profiles").select("*").eq("id", user.id).maybeSingle();

  if (error || !data) {
    return { error: forbiddenResponse("Perfil de usuário não encontrado.") } as const;
  }

  const profile = mapUserProfile(data as ProfileRow);

  if (!profile.isActive) {
    return { error: forbiddenResponse("Usuário desativado.") } as const;
  }

  return { user, profile } as const;
}

export async function requireAdmin() {
  const auth = await requireAuth();
  if ("error" in auth) return auth;
  if (!isAdmin(auth.profile)) {
    return { error: forbiddenResponse("Somente administradores podem executar esta ação.") };
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
