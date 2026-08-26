import { NextResponse } from "next/server";
import type { ManualSaleCostKind, ManualSaleCostObligation, ManualSaleCostStatus } from "@/data/manual-sale-cost-types";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const allowedStatuses = new Set<ManualSaleCostStatus>(["pending", "paid", "cancelled"]);

function validUuid(value: string | null) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function isMissingManualSaleCosts(error: { message?: string; code?: string } | null) {
  return error?.code === "42P01"
    || /manual_sale_cost_obligations|schema cache/i.test(String(error?.message || ""));
}

function mapObligation(
  row: Record<string, unknown>,
  salesById: Map<string, Record<string, unknown>>
): ManualSaleCostObligation {
  const saleId = String(row.sale_id || "");
  const sale = salesById.get(saleId) || {};
  return {
    id: String(row.id || ""),
    saleId,
    costKind: String(row.cost_kind || "product") as ManualSaleCostKind,
    productId: row.product_id ? String(row.product_id) : undefined,
    description: String(row.description || ""),
    amount: Number(row.amount || 0),
    status: String(row.status || "pending") as ManualSaleCostStatus,
    expenseId: row.expense_id ? String(row.expense_id) : undefined,
    paidAt: row.paid_at_timestamp
      ? String(row.paid_at_timestamp)
      : row.paid_at ? String(row.paid_at) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    sale: {
      customerName: String(sale.customer_name || "Venda vinculada"),
      productName: String(sale.product_name || "Produto"),
      saleDate: String(sale.created_at || "").slice(0, 10),
      salePlatform: sale.sale_platform ? String(sale.sale_platform) : undefined,
      deletedAt: sale.deleted_at ? String(sale.deleted_at) : undefined
    }
  };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({
      configured: false,
      setupRequired: true,
      obligations: [],
      pendingTotal: 0,
      error: "Supabase admin não configurado."
    });
  }

  const searchParams = new URL(request.url).searchParams;
  const requestedStatus = searchParams.get("status") as ManualSaleCostStatus | null;
  if (requestedStatus && !allowedStatuses.has(requestedStatus)) {
    return NextResponse.json({ error: "Informe um status válido para os custos." }, { status: 400 });
  }
  const rawSaleId = searchParams.get("saleId");
  const saleId = validUuid(rawSaleId);
  if (rawSaleId && !saleId) {
    return NextResponse.json({ error: "Informe uma venda válida para consultar os custos." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  let query = admin
    .from("manual_sale_cost_obligations")
    .select("*")
    .eq("company_id", auth.companyId)
    .order("created_at", { ascending: false });
  if (requestedStatus) query = query.eq("status", requestedStatus);
  if (saleId) query = query.eq("sale_id", saleId);

  const { data, error } = await query;
  if (error) {
    if (isMissingManualSaleCosts(error)) {
      return NextResponse.json({
        configured: true,
        setupRequired: true,
        obligations: [],
        pendingTotal: 0,
        message: "A migration 034 precisa ser aplicada para ativar os custos a pagar da Venda Manual."
      });
    }
    return NextResponse.json({ error: "Não foi possível carregar os custos a pagar." }, { status: 500 });
  }

  const rows = (data || []) as Record<string, unknown>[];
  const saleIds = Array.from(new Set(rows.map((row) => String(row.sale_id || "")).filter(Boolean)));
  const salesById = new Map<string, Record<string, unknown>>();
  if (saleIds.length) {
    const sales = await admin
      .from("sales")
      .select("id,customer_name,product_name,sale_platform,created_at,deleted_at")
      .eq("company_id", auth.companyId)
      .in("id", saleIds);
    if (sales.error) {
      return NextResponse.json({ error: "Não foi possível identificar as vendas vinculadas aos custos." }, { status: 500 });
    }
    (sales.data || []).forEach((sale) => salesById.set(String(sale.id), sale as Record<string, unknown>));
  }

  const obligations = rows
    .map((row) => mapObligation(row, salesById))
    .filter((item) => item.status !== "pending" || !item.sale.deletedAt);
  const pendingTotal = obligations
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + item.amount, 0);

  return NextResponse.json(
    { configured: true, setupRequired: false, obligations, pendingTotal },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
