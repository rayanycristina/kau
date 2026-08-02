import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";
import { isGuaranteeCustomerPaymentConfirmed, isGuaranteeSaleFinanciallyValid } from "@/data/guarantee-types";

export const dynamic = "force-dynamic";

function missing(error: { code?: string; message?: string } | null) { return error?.code === "42P01" || /postpaid_guarantees|guarantee_settings|schema cache/i.test(error?.message || ""); }
function status(row: Record<string, unknown>, sale: Record<string, unknown>) { if (row.paid_at && row.paid_amount) return "paid"; if (!row.is_active || !isGuaranteeSaleFinanciallyValid(sale)) return "inactive"; if (row.guarantee_type === "mandatory") return "due"; return isGuaranteeCustomerPaymentConfirmed(sale) ? "released" : "risk"; }
function map(row: Record<string, unknown>) { const relation = row.sales; const sale = (Array.isArray(relation) ? relation[0] : relation || {}) as Record<string, unknown>; return { id: String(row.id), saleId: String(row.sale_id), guaranteeType: row.guarantee_type, guaranteeAmount: Number(row.guarantee_amount), isActive: Boolean(row.is_active), paidAmount: row.paid_amount == null ? undefined : Number(row.paid_amount), paidAt: row.paid_at || undefined, expenseId: row.expense_id || undefined, notes: row.notes || undefined, createdAt: row.created_at, updatedAt: row.updated_at, status: status(row, sale), sale: { customerName: sale.customer_name || "", productName: sale.product_name || "Produto", totalAmount: Number(sale.total_amount || 0), saleDate: sale.sale_date || String(sale.created_at || "").slice(0, 10), salePlatform: sale.sale_platform, paymentMethod: sale.payment_method, paymentStatus: sale.payment_status, deliveryType: sale.delivery_type, deliveryStatus: sale.delivery_status, orderStatus: sale.order_status } }; }
function mapSetting(row: Record<string, unknown>) { return { id: String(row.id), platform: row.platform, paymentMode: row.payment_mode, defaultAmount: Number(row.default_amount), isActive: Boolean(row.is_active), effectiveFrom: row.effective_from, createdAt: row.created_at, updatedAt: row.updated_at }; }

export async function GET(request: Request) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ configured: false, setupRequired: true, guarantees: [], settings: [] });
  const admin = getSupabaseAdminClient(); const url = new URL(request.url); const saleId = url.searchParams.get("saleId");
  let query = admin.from("postpaid_guarantees").select("*,sales(*)").order("created_at", { ascending: false }); if (saleId) query = query.eq("sale_id", saleId);
  const [{ data, error }, settingsResult] = await Promise.all([query, admin.from("guarantee_settings").select("*").order("effective_from", { ascending: false })]);
  if (missing(error) || missing(settingsResult.error)) return NextResponse.json({ configured: true, setupRequired: true, guarantees: [], settings: [], message: "A migration 024 precisa ser aplicada para ativar Garantias pós-pagas." });
  if (error || settingsResult.error) return NextResponse.json({ error: "Não foi possível carregar as garantias." }, { status: 500 });
  return NextResponse.json({ configured: true, setupRequired: false, guarantees: ((data || []) as Record<string, unknown>[]).map(map), settings: ((settingsResult.data || []) as Record<string, unknown>[]).map(mapSetting) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => ({})); const saleId = String(body.saleId || ""); const type = body.guaranteeType === "mandatory" ? "mandatory" : "conditional"; const amount = Number(body.guaranteeAmount);
  if (!saleId || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Informe venda, tipo e valor válidos." }, { status: 400 });
  const admin = getSupabaseAdminClient(); const existing = await admin.from("postpaid_guarantees").select("paid_at").eq("sale_id", saleId).maybeSingle();
  if (existing.error && missing(existing.error)) return NextResponse.json({ error: "A migration 024 precisa ser aplicada.", setupRequired: true }, { status: 409 });
  if (existing.data?.paid_at) return NextResponse.json({ error: "Estorne o pagamento antes de alterar esta garantia." }, { status: 409 });
  const { data, error } = await admin.from("postpaid_guarantees").upsert({ sale_id: saleId, guarantee_type: type, guarantee_amount: Math.round(amount * 100) / 100, is_active: body.isActive !== false, updated_by: auth.user.id }, { onConflict: "sale_id" }).select("id").single();
  if (error) return NextResponse.json({ error: "Não foi possível sincronizar a garantia." }, { status: 500 }); return NextResponse.json({ guarantee: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error; const body = await request.json().catch(() => ({})); const id = String(body.id || ""); const amount = Number(body.defaultAmount);
  if (!id || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Configuração inválida." }, { status: 400 });
  const { error } = await getSupabaseAdminClient().from("guarantee_settings").update({ default_amount: Math.round(amount * 100) / 100, is_active: Boolean(body.isActive), effective_from: body.effectiveFrom }).eq("id", id);
  if (error) return NextResponse.json({ error: "Não foi possível atualizar a configuração." }, { status: 500 }); return NextResponse.json({ success: true });
}
