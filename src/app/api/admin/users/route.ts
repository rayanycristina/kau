import { NextResponse } from "next/server";
import { requireAdmin, mapUserProfile } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function cleanRole(value: unknown) {
  return value === "admin" ? "admin" : "seller";
}

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users: (data ?? []).map((row) => mapUserProfile(row as any)) });
}

export async function POST(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const email = cleanText(body.email).toLowerCase();
  const password = cleanText(body.password);
  const fullName = cleanText(body.fullName);
  const sellerDisplayName = cleanText(body.sellerDisplayName);
  const role = cleanRole(body.role);
  const commissionPercent = Number(body.commissionPercent ?? (role === "admin" ? 15 : 5));

  if (!email || !password || !fullName || !sellerDisplayName) {
    return NextResponse.json({ error: "Informe e-mail, senha, nome e nome de vendedor." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      seller_display_name: sellerDisplayName,
      role,
      commission_percent: commissionPercent
    }
  });

  if (created.error || !created.data.user) {
    return NextResponse.json({ error: created.error?.message || "Não foi possível criar usuário." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert({
      id: created.data.user.id,
      email,
      full_name: fullName,
      seller_display_name: sellerDisplayName,
      role,
      commission_percent: Number.isFinite(commissionPercent) ? commissionPercent : 5,
      is_active: body.isActive !== false
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ user: mapUserProfile(data as any) }, { status: 201 });
}
