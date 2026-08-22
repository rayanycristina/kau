import { NextResponse } from "next/server";
import { isAdmin, requireAdmin, requireAuth } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function commissionPercent(value: unknown) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const number = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(number) || number < 0 || number > 100) return null;
  return Math.round(number * 100) / 100;
}

function isSetupError(error: { message?: string; code?: string } | null) {
  return /sellers|seller_id|schema cache|does not exist|could not find/i.test(`${error?.code || ""} ${error?.message || ""}`);
}

function softDeleteSchemaMissing(error: { code?: string; message?: string } | null) {
  return ["42703", "PGRST204"].includes(String(error?.code || "")) || /deleted_at/i.test(String(error?.message || ""));
}

function mapSeller(row: Record<string, unknown>, metrics?: { count: number; total: number }) {
  const fullName = String(row.full_name || "");
  const displayName = row.display_name ? String(row.display_name) : null;
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    fullName,
    displayName,
    name: displayName || fullName,
    login: row.username ? String(row.username) : "",
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    commissionPercent: Number(row.commission_percent || 0),
    active: row.status === "active",
    isOwner: Boolean(row.is_owner),
    salesCount: metrics?.count || 0,
    salesTotal: metrics?.total || 0
  };
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });

  const admin = getSupabaseAdminClient();
  const activeOnly = new URL(request.url).searchParams.get("active") === "true" || !isAdmin(auth.profile);
  let query = admin.from("sellers").select("*").order("is_owner", { ascending: false }).order("full_name");
  if (activeOnly) query = query.eq("status", "active");
  const { data, error } = await query;
  if (error) {
    if (isSetupError(error)) return NextResponse.json({ sellers: [], setupRequired: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const metrics = new Map<string, { count: number; total: number }>();
  if (isAdmin(auth.profile)) {
    let salesResult = await admin.from("sales").select("seller_id,total_amount").is("deleted_at", null).not("seller_id", "is", null);
    if (salesResult.error && softDeleteSchemaMissing(salesResult.error)) {
      salesResult = await admin.from("sales").select("seller_id,total_amount").not("seller_id", "is", null);
    }
    const sales = salesResult.data;
    for (const sale of sales ?? []) {
      const id = String(sale.seller_id || "");
      const current = metrics.get(id) ?? { count: 0, total: 0 };
      current.count += 1;
      current.total += Number(sale.total_amount || 0);
      metrics.set(id, current);
    }
  }

  return NextResponse.json({ sellers: (data ?? []).map((row) => mapSeller(row, metrics.get(String(row.id)))), setupRequired: false });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const fullName = cleanText(body.fullName);
  const percent = commissionPercent(body.commissionPercent);
  if (!fullName) return NextResponse.json({ error: "Informe o nome completo." }, { status: 400 });
  if (percent === null) return NextResponse.json({ error: "A comissão deve ser um percentual entre 0 e 100." }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("sellers").insert({
    full_name: fullName,
    display_name: cleanText(body.displayName),
    username: cleanText(body.username),
    email: cleanText(body.email)?.toLowerCase(),
    phone: cleanText(body.phone),
    commission_percent: percent,
    status: body.active === false ? "inactive" : "active",
    is_owner: false
  }).select("*").single();

  if (error || !data) {
    if (isSetupError(error)) return NextResponse.json({ error: "A migration 026 precisa ser aplicada para cadastrar vendedores.", setupRequired: true }, { status: 409 });
    if (error?.code === "23505") return NextResponse.json({ error: "Já existe um vendedor com esse nome, login ou e-mail." }, { status: 409 });
    return NextResponse.json({ error: error?.message || "Não foi possível cadastrar o vendedor." }, { status: 500 });
  }
  return NextResponse.json({ seller: mapSeller(data) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const id = cleanText(body.id);
  if (!id) return NextResponse.json({ error: "Vendedor inválido." }, { status: 400 });
  const admin = getSupabaseAdminClient();
  const { data: current, error: currentError } = await admin.from("sellers").select("*").eq("id", id).maybeSingle();
  if (currentError || !current) return NextResponse.json({ error: "Vendedor não encontrado." }, { status: 404 });
  if (current.is_owner && body.active === false) return NextResponse.json({ error: "A dona da operação não pode ser desativada." }, { status: 409 });
  if (current.is_owner && body.fullName !== undefined && cleanText(body.fullName) !== "Rayany Cristina Feitosa da Silva") return NextResponse.json({ error: "A identificação da dona da operação não pode ser alterada por este cadastro." }, { status: 409 });

  const patch: Record<string, unknown> = {};
  if (body.fullName !== undefined) {
    const value = cleanText(body.fullName);
    if (!value) return NextResponse.json({ error: "Informe o nome completo." }, { status: 400 });
    patch.full_name = value;
  }
  if (body.displayName !== undefined) patch.display_name = cleanText(body.displayName);
  if (body.username !== undefined) patch.username = cleanText(body.username);
  if (body.email !== undefined) patch.email = cleanText(body.email)?.toLowerCase();
  if (body.phone !== undefined) patch.phone = cleanText(body.phone);
  if (body.commissionPercent !== undefined) {
    const percent = commissionPercent(body.commissionPercent);
    if (percent === null) return NextResponse.json({ error: "A comissão deve ser um percentual entre 0 e 100." }, { status: 400 });
    patch.commission_percent = current.is_owner ? 0 : percent;
  }
  if (body.active !== undefined) patch.status = body.active ? "active" : "inactive";

  const { data, error } = await admin.from("sellers").update(patch).eq("id", id).select("*").single();
  if (error || !data) {
    if (error?.code === "23505") return NextResponse.json({ error: "Já existe um vendedor com esse nome, login ou e-mail." }, { status: 409 });
    return NextResponse.json({ error: error?.message || "Não foi possível atualizar o vendedor." }, { status: 500 });
  }
  return NextResponse.json({ seller: mapSeller(data) });
}
