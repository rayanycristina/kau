import { NextResponse } from "next/server";
import { isSeller, requireAuth } from "@/lib/auth";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase-server";
import { getSaleFinancialState, getOrderStatusFromSale } from "@/data/sale-financial-state";

export const dynamic = "force-dynamic";

function softDeleteSchemaMissing(error: { code?: string; message?: string } | null) {
  return ["42703", "PGRST204"].includes(String(error?.code || "")) || /deleted_at/i.test(String(error?.message || ""));
}

function commissionPercentFromStored(value: unknown) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round((number <= 1 ? number * 100 : number) * 100) / 100;
}

function calculateCommission(total: unknown, rate: unknown) {
  const amount = Number(total || 0);
  const percent = commissionPercentFromStored(rate);
  return Math.round(amount * (percent / 100) * 100) / 100;
}


function normalizedOrderStatus(row: Record<string, unknown>) {
  return getOrderStatusFromSale(row);
}

function saleState(row: Record<string, unknown>) {
  return getSaleFinancialState(row);
}

function isInvalidForMetrics(row: Record<string, unknown>) {
  return !saleState(row).isValidSale;
}

function isFinanciallyBlocked(row: Record<string, unknown>) {
  return isInvalidForMetrics(row);
}

function ownerCommission(row: Record<string, unknown>) {
  if (isFinanciallyBlocked(row)) return 0;
  const amount = Number(row.total_amount || 0);
  const exactAmount = row.operation_commission_amount == null ? null : Number(row.operation_commission_amount);
  if (exactAmount !== null && Number.isFinite(exactAmount)) return Math.round(exactAmount * 100) / 100;
  const explicitPercent = row.operation_commission_percent == null ? null : Number(row.operation_commission_percent);
  if (explicitPercent !== null && Number.isFinite(explicitPercent) && explicitPercent >= 0) return Math.round(amount * (explicitPercent / 100) * 100) / 100;
  return 0;
}

function subCommission(row: Record<string, unknown>) {
  if (isFinanciallyBlocked(row)) return 0;
  const exactAmount = row.commission_amount == null ? null : Number(row.commission_amount);
  if (exactAmount !== null && Number.isFinite(exactAmount) && exactAmount >= 0) return Math.round(exactAmount * 100) / 100;
  return calculateCommission(row.total_amount, row.commission_rate);
}

function mapSale(row: Record<string, unknown>) {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || undefined,
    city: row.city,
    state: row.state || undefined,
    productName: row.product_name,
    quantity: Number(row.quantity),
    kitQuantity: row.kit_quantity == null ? null : Number(row.kit_quantity),
    bottleQuantity: row.bottle_quantity == null ? null : Number(row.bottle_quantity),
    totalAmount: Number(row.total_amount),
    operationCommissionAmount: row.operation_commission_amount == null ? null : Number(row.operation_commission_amount),
    operationCommissionPercent: row.operation_commission_percent == null ? null : Number(row.operation_commission_percent),
    sellerName: row.seller_name,
    salePlatform: row.sale_platform || undefined,
    commissionRate: commissionPercentFromStored(row.commission_rate),
    commissionAmount: row.commission_amount == null ? calculateCommission(row.total_amount, row.commission_rate) : Number(row.commission_amount),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    deliveryType: row.delivery_type,
    deliveryStatus: row.delivery_status,
    orderStatus: normalizedOrderStatus(row),
    orderTags: Array.isArray(row.order_tags) ? row.order_tags : [],
    orderStatusNote: row.order_status_note || undefined,
    expectedPaymentDate: row.expected_payment_date || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ configured: false });
  }

  const supabase = getSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  let query = supabase.from("sales").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(500);
  if (isSeller(auth.profile)) {
    query = query.eq("seller_name", auth.profile.sellerDisplayName);
  }
  const { data, error } = await query;

  if (error && softDeleteSchemaMissing(error)) {
    return NextResponse.json({ configured: true, error: "O campo deleted_at é necessário para calcular o resumo com segurança." }, { status: 409 });
  }

  if (error) {
    return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const todayRows = rows.filter((row) => saleState(row).countsRevenue);
  const scheduledTodayRows = rows.filter((row) => saleState(row).isValidSale && String(row.expected_payment_date || "") === today);
  const dailyRevenue = todayRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
  const totalCommission = todayRows.reduce((sum, row) => sum + ownerCommission(row), 0);
  const sellerMap = new Map<string, { sellerName: string; salesCount: number; revenue: number; commission: number; commissionRate: number }>();

  for (const row of todayRows) {
    const sellerName = String(row.seller_name || "Sem vendedor");
    const current = sellerMap.get(sellerName) ?? { sellerName, salesCount: 0, revenue: 0, commission: 0, commissionRate: commissionPercentFromStored(row.commission_rate) };
    current.salesCount += 1;
    current.revenue += Number(row.total_amount || 0);
    current.commission += subCommission(row);
    current.commissionRate = commissionPercentFromStored(row.commission_rate || current.commissionRate || 0);
    sellerMap.set(sellerName, current);
  }

  const sellerSummaries = [...sellerMap.values()].sort((a, b) => b.revenue - a.revenue);
  const gabrielCommission = todayRows
    .filter((row) => row.seller_name === "Gabriel Moreira")
    .reduce((sum, row) => sum + subCommission(row), 0);
  const elisangelaCommission = todayRows
    .filter((row) => row.seller_name === "Elisangela")
    .reduce((sum, row) => sum + subCommission(row), 0);

  return NextResponse.json({
    configured: true,
    salesCount: todayRows.length,
    dailyRevenue,
    totalCommission,
    averageTicket: todayRows.length ? dailyRevenue / todayRows.length : 0,
    sellerSummaries,
    gabrielCommission,
    elisangelaCommission,
    scheduledTodayCount: scheduledTodayRows.length,
    scheduledTodayRevenue: scheduledTodayRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
    scheduledTodaySales: scheduledTodayRows.map(mapSale),
    lastSale: todayRows[0] ? mapSale(todayRows[0]) : undefined
  });
}
