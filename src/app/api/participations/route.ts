import { NextResponse } from "next/server";
import type { ParticipationStatus } from "@/data/participation-types";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const statuses = new Set<ParticipationStatus>(["pending", "paid", "cancelled"]);
const map = (row: Record<string, unknown>, sales: Map<string, Record<string, unknown>>) => { const sale = sales.get(String(row.sale_id)) || {}; return { id: String(row.id), saleId: String(row.sale_id), productId: String(row.product_id), coproducerId: String(row.coproducer_id), ruleId: String(row.rule_id), coproducerName: String(row.coproducer_name_snapshot), role: row.role_snapshot, calculationType: row.calculation_type_snapshot, calculationBasis: row.calculation_basis_snapshot, basisAmount: Number(row.basis_amount_snapshot), percent: row.percent_snapshot == null ? undefined : Number(row.percent_snapshot), fixedAmount: row.fixed_amount_snapshot == null ? undefined : Number(row.fixed_amount_snapshot), amount: Number(row.amount_snapshot), status: row.status, paidAt: row.paid_at || undefined, expenseId: row.expense_id || undefined, createdAt: row.created_at, sale: { customerName: String(sale.customer_name || "Venda vinculada"), productName: String(sale.product_name || "Produto"), saleDate: String(sale.created_at || "").slice(0,10), deletedAt: sale.deleted_at || undefined } }; };

export async function GET(request: Request) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error;
  const status = new URL(request.url).searchParams.get("status") as ParticipationStatus | null;
  if (status && !statuses.has(status)) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  const admin = getSupabaseAdminClient(); let query = admin.from("sale_coproducer_obligations").select("*").order("created_at", { ascending: false }); if (status) query = query.eq("status", status);
  const result = await query;
  if (result.error) return /sale_coproducer_obligations|schema cache/i.test(result.error.message) ? NextResponse.json({ setupRequired: true, participations: [], pendingTotal: 0 }) : NextResponse.json({ error: result.error.message }, { status: 500 });
  const rows = (result.data || []) as Record<string, unknown>[]; const ids = [...new Set(rows.map((row) => String(row.sale_id)))]; const sales = new Map<string, Record<string, unknown>>();
  if (ids.length) { const saleResult = await admin.from("sales").select("id,customer_name,product_name,created_at,deleted_at").in("id", ids); if (saleResult.error) return NextResponse.json({ error: "Não foi possível carregar as vendas vinculadas." }, { status: 500 }); (saleResult.data || []).forEach((sale) => sales.set(String(sale.id), sale as Record<string, unknown>)); }
  const participations = rows.map((row) => map(row, sales)).filter((item) => item.status !== "pending" || !item.sale.deletedAt);
  return NextResponse.json({ setupRequired: false, participations, pendingTotal: participations.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.amount, 0) }, { headers: { "Cache-Control": "no-store" } });
}
