import { NextResponse } from "next/server";
import { requireAdmin, mapUserProfile } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function cleanRole(value: unknown) {
  return value === "admin" ? "admin" : "seller";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (body.email !== undefined) updates.email = cleanText(body.email).toLowerCase();
  if (body.fullName !== undefined) updates.full_name = cleanText(body.fullName);
  if (body.sellerDisplayName !== undefined) updates.seller_display_name = cleanText(body.sellerDisplayName);
  if (body.role !== undefined) updates.role = cleanRole(body.role);
  if (body.commissionPercent !== undefined) updates.commission_percent = Number(body.commissionPercent);
  if (body.isActive !== undefined) updates.is_active = Boolean(body.isActive);
  updates.updated_at = new Date().toISOString();

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ user: mapUserProfile(data as any) });
}
