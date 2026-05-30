import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { KAU_ACCESS_COOKIE } from "@/lib/auth-cookies";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase-server";
import type { UserProfile } from "@/data/user-profile-types";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  seller_display_name: string;
  role: "admin" | "seller";
  commission_percent: number;
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
    commissionPercent: Number(row.commission_percent ?? 5),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function unauthorizedResponse(message = "Login obrigatório.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Sem permissão para acessar este recurso.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function isAdmin(profile: UserProfile) {
  return profile.role === "admin";
}

export function isSeller(profile: UserProfile) {
  return profile.role === "seller";
}

export function sellerNameMatches(profile: UserProfile, sellerName: unknown) {
  if (isAdmin(profile)) return true;
  return String(sellerName || "").trim() === profile.sellerDisplayName;
}

export function forceSellerNameForProfile<T extends Record<string, any>>(profile: UserProfile, body: T): T {
  if (isAdmin(profile)) return body;
  return { ...body, sellerName: profile.sellerDisplayName, seller_name: profile.sellerDisplayName };
}

export function applySellerScope<T extends { eq: (column: string, value: string) => T }>(query: T, profile: UserProfile) {
  return isAdmin(profile) ? query : query.eq("seller_name", profile.sellerDisplayName);
}

export async function getCurrentUserProfile(): Promise<{ profile?: UserProfile; response?: NextResponse }> {
  if (!hasSupabaseConfig()) {
    return { response: NextResponse.json({ error: "Supabase não configurado." }, { status: 503 }) };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(KAU_ACCESS_COOKIE)?.value;

  if (!token) {
    return { response: unauthorizedResponse() };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return { response: NextResponse.json({ error: "NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausente." }, { status: 503 }) };
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return { response: unauthorizedResponse("Sessão expirada. Faça login novamente.") };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userData.user.id)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return { response: forbiddenResponse("Perfil de usuário não encontrado ou inativo.") };
  }

  return { profile: mapUserProfile(data as ProfileRow) };
}

export async function requireAuth() {
  return getCurrentUserProfile();
}

export async function requireAdmin() {
  const auth = await getCurrentUserProfile();
  if (auth.response || !auth.profile) return auth;
  if (!isAdmin(auth.profile)) return { response: forbiddenResponse("Acesso exclusivo da administradora.") };
  return auth;
}
