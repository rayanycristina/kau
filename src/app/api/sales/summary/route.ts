import { NextResponse } from "next/server";
import { isSeller, requireAuth } from "@/lib/auth";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase-server";
import { getSaleFinancialState, getOrderStatusFromSale } from "@/data/sale-financial-state";

export const dynamic = "force-dynamic";

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


function normalizedOrderStatus(row: Record<string, any>) {
  return getOrderStatusFromSale(row);
}

function saleState(row: Record<string, any>) {
  return getSaleFinancialState(row);
}

function isInvalidForMetrics(row: Record<string, any>) {
  return !saleState(row).isValidSale;
}

function isFinanciallyBlocked(row: Record<string, any>) {
  return isInvalidForMetrics(row);
}

function isOwnerSeller(name?: string) {
  return String(name || "").toLowerCase().includes("rayany");
}

function ownerCommission(row: Record<string, any>) {
  if (isFinanciallyBlocked(row)) return 0;
  if (isOwnerSeller(row.seller_name)) return calculateCommission(row.total_amount, row.commission_rate || 15);
  const amount = Number(row.total_amount || 0);
  return Math.round(amount * 0.10 * 100) / 100;
}

function subCommission(row: Record<string, any>) {
  if (isFinanciallyBlocked(row)) return 0;
  if (isOwnerSeller(row.seller_name)) return 0;
  return calculateCommission(row.total_amount, row.commission_rate || 5);
}

function mapSale(row: Record<string, any>) {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || undefined,
    city: row.city,
    productName: row.product_name,
    quantity: Number(row.quantity),
    totalAmount: Number(row.total_amount),
    sellerName: row.seller_name,
    salePlatform: row.sale_platform || undefined,
    commissionRate: commissionPercentFromStored(row.commission_rate),
    commissionAmount: calculateCommission(row.total_amount, row.commission_rate),
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
  let query = supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(500);
  if (isSeller(auth.profile)) {
    query = query.eq("seller_name", auth.profile.sellerDisplayName);
  }
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Record<string, any>[];
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
    current.commission += calculateCommission(row.total_amount, row.commission_rate);
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
