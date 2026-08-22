import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";

const select = "id,name,status,email,phone,notes,created_at,updated_at";
const text = (value: unknown) => typeof value === "string" ? value.trim() || null : null;
const missing = (error: { code?: string; message?: string } | null) => error?.code === "42P01" || /coproducers|schema cache/i.test(String(error?.message || ""));
const map = (row: Record<string, unknown>) => ({ id: String(row.id), name: String(row.name), status: row.status, email: row.email || undefined, phone: row.phone || undefined, notes: row.notes || undefined, createdAt: row.created_at, updatedAt: row.updated_at });

export async function GET() {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  const result = await getSupabaseAdminClient().from("coproducers").select(select).order("name");
  if (result.error) return missing(result.error) ? NextResponse.json({ setupRequired: true, coproducers: [] }) : NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ setupRequired: false, coproducers: (result.data || []).map((row) => map(row as Record<string, unknown>)) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>; const name = text(body.name);
  if (!name) return NextResponse.json({ error: "Informe o nome do coprodutor." }, { status: 400 });
  const result = await getSupabaseAdminClient().from("coproducers").insert({ name, status: "active", email: text(body.email), phone: text(body.phone), notes: text(body.notes), created_by: auth.user.id }).select(select).single();
  if (result.error) return missing(result.error) ? NextResponse.json({ error: "A migration 036 precisa ser aplicada.", setupRequired: true }, { status: 409 }) : NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ coproducer: map(result.data as Record<string, unknown>) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>; const id = text(body.id); const name = text(body.name); const status = body.status === "inactive" ? "inactive" : "active";
  if (!id || !name) return NextResponse.json({ error: "Informe coprodutor e nome válidos." }, { status: 400 });
  const result = await getSupabaseAdminClient().from("coproducers").update({ name, status, email: text(body.email), phone: text(body.phone), notes: text(body.notes) }).eq("id", id).select(select).maybeSingle();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  if (!result.data) return NextResponse.json({ error: "Coprodutor não encontrado." }, { status: 404 });
  return NextResponse.json({ coproducer: map(result.data as Record<string, unknown>) });
}
