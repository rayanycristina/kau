import { NextResponse } from "next/server";
import { fallbackExpenseCategoryDefinitions, type ExpenseCategoryDefinition } from "@/data/expense-types";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function mapCategory(row: Record<string, unknown>): ExpenseCategoryDefinition {
  return { id: String(row.id), name: String(row.name), slug: String(row.slug), isSystem: Boolean(row.is_system), isActive: Boolean(row.is_active), createdAt: String(row.created_at || ""), updatedAt: String(row.updated_at || "") };
}

function missingTable(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || /expense_categories|schema cache/i.test(String(error?.message || ""));
}

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ categories: fallbackExpenseCategoryDefinitions, setupRequired: true });
  const { data, error } = await getSupabaseAdminClient().from("expense_categories").select("*").order("is_system", { ascending: false }).order("name");
  if (error && missingTable(error)) return NextResponse.json({ categories: fallbackExpenseCategoryDefinitions, setupRequired: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: (data || []).map((row) => mapCategory(row)), setupRequired: false });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const name = cleanName(body.name);
  const slug = slugify(name);
  if (name.length < 2 || name.length > 60 || !slug) return NextResponse.json({ error: "Informe um nome de categoria válido." }, { status: 400 });
  const { data, error } = await getSupabaseAdminClient().from("expense_categories").insert({ name, slug, is_system: false, is_active: true, created_by: auth.user.id }).select("*").single();
  if (error && missingTable(error)) return NextResponse.json({ error: "A migration 030 precisa ser aplicada para criar categorias personalizadas.", setupRequired: true }, { status: 409 });
  if (error?.code === "23505") return NextResponse.json({ error: "Já existe uma categoria com esse nome ou identificador." }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: mapCategory(data) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Informe a categoria." }, { status: 400 });
  const admin = getSupabaseAdminClient();
  const current = await admin.from("expense_categories").select("*").eq("id", id).maybeSingle();
  if (current.error) return NextResponse.json({ error: current.error.message }, { status: 500 });
  if (!current.data) return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
  if (current.data.is_system) return NextResponse.json({ error: "Categorias padrão do sistema não podem ser alteradas por esta ação." }, { status: 409 });
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) { const name = cleanName(body.name); if (name.length < 2 || name.length > 60) return NextResponse.json({ error: "Informe um nome válido." }, { status: 400 }); update.name = name; }
  if (typeof body.isActive === "boolean") update.is_active = body.isActive;
  const result = await admin.from("expense_categories").update(update).eq("id", id).select("*").single();
  if (result.error?.code === "23505") return NextResponse.json({ error: "Já existe uma categoria com esse nome." }, { status: 409 });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ category: mapCategory(result.data) });
}
