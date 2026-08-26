import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const ruleSelect = "id,product_id,coproducer_id,role,calculation_type,calculation_basis,percent,fixed_amount,effective_from,effective_to,status,created_at,coproducers(id,name,status,email,phone,notes,created_at,updated_at)";
const date = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
const money = (value: unknown) => { const n = Number(String(value ?? "").replace(",", ".")); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null; };
const map = (row: Record<string, unknown>) => { const relation = Array.isArray(row.coproducers) ? row.coproducers[0] : row.coproducers; const c = (relation || {}) as Record<string, unknown>; return { id: row.id, productId: row.product_id, coproducerId: row.coproducer_id, role: row.role, calculationType: row.calculation_type, calculationBasis: row.calculation_basis, percent: row.percent == null ? undefined : Number(row.percent), fixedAmount: row.fixed_amount == null ? undefined : Number(row.fixed_amount), effectiveFrom: row.effective_from, effectiveTo: row.effective_to || undefined, status: row.status, createdAt: row.created_at, coproducer: { id: c.id, name: c.name, status: c.status, email: c.email || undefined, phone: c.phone || undefined, notes: c.notes || undefined } }; };

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error; const { id } = await context.params;
  const result = await getSupabaseAdminClient().from("product_coproducer_rules").select(ruleSelect).eq("company_id", auth.companyId).eq("product_id", id).order("effective_from", { ascending: false });
  if (result.error) return /product_coproducer_rules|schema cache/i.test(result.error.message) ? NextResponse.json({ setupRequired: true, rules: [] }) : NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ setupRequired: false, rules: (result.data || []).map((row) => map(row as Record<string, unknown>)) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error; const { id } = await context.params; const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const effectiveFrom = date(body.effectiveFrom); const type = body.calculationType === "fixed" ? "fixed" : "percent"; const amount = money(type === "fixed" ? body.fixedAmount : body.percent);
  if (!body.coproducerId || !effectiveFrom || !amount) return NextResponse.json({ error: "Preencha coprodutor, regra e vigência." }, { status: 400 });
  const insert = { company_id: auth.companyId, product_id: id, coproducer_id: body.coproducerId, role: ["partner","producer"].includes(String(body.role)) ? body.role : "coproducer", calculation_type: type, calculation_basis: "operation_revenue", percent: type === "percent" ? amount : null, fixed_amount: type === "fixed" ? amount : null, effective_from: effectiveFrom, status: "active", created_by: auth.user.id };
  const result = await getSupabaseAdminClient().from("product_coproducer_rules").insert(insert).select(ruleSelect).single();
  if (result.error) return NextResponse.json({ error: result.error.code === "23505" ? "Já existe uma regra para este coprodutor nesta vigência." : result.error.message }, { status: 409 });
  return NextResponse.json({ rule: map(result.data as Record<string, unknown>) }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error; const { id } = await context.params; const body = await request.json().catch(() => ({})) as Record<string, unknown>; const effectiveTo = date(body.effectiveTo);
  if (!body.ruleId || !effectiveTo) return NextResponse.json({ error: "Informe regra e data de encerramento." }, { status: 400 });
  const result = await getSupabaseAdminClient().from("product_coproducer_rules").update({ status: "ended", effective_to: effectiveTo }).eq("company_id", auth.companyId).eq("id", body.ruleId).eq("product_id", id).select(ruleSelect).maybeSingle();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 409 });
  return NextResponse.json({ rule: result.data ? map(result.data as Record<string, unknown>) : null });
}
