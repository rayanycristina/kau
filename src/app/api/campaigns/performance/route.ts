import { NextResponse } from "next/server";
import { calculateCampaignMetrics, operationRevenueForCampaignSale } from "@/data/campaign-metrics";
import type { AdAccount, AdPlatform, Campaign, CampaignAttributionSummary, CampaignBreakdownRow, CampaignExpenseAttributionRow, CampaignPerformanceResponse, CampaignStatus } from "@/data/campaign-types";
import { isOperationalSale } from "@/data/sale-financial-state";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
const txt = (value: unknown) => value == null || value === "" ? undefined : String(value);
const missing = (error: { code?: string; message?: string } | null) => error?.code === "42P01" || /campaigns|ad_accounts|campaign_id|schema cache/i.test(String(error?.message || ""));
const softDeleteSchemaMissing = (error: { code?: string; message?: string } | null) => ["42703", "PGRST204"].includes(String(error?.code || "")) || /deleted_at/i.test(String(error?.message || ""));

function account(row: Record<string, unknown>): AdAccount { return { id: String(row.id), name: String(row.name), platform: row.platform as AdPlatform, externalAccountId: txt(row.external_account_id), status: row.status === "inactive" ? "inactive" : "active" }; }
function campaign(row: Record<string, unknown>, accounts: Map<string, AdAccount>): Campaign { const accountId = txt(row.ad_account_id); return { id: String(row.id), name: String(row.name), adAccountId: accountId, adAccountName: accountId ? accounts.get(accountId)?.name : undefined, adPlatform: row.ad_platform as AdPlatform, productName: txt(row.product_name), status: row.status as CampaignStatus, externalCampaignId: txt(row.external_campaign_id), startDate: txt(row.start_date), endDate: txt(row.end_date), notes: txt(row.notes) }; }
function isoDate(value: string | null, fallback: string) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback; }
const emptyAttribution = (): CampaignAttributionSummary => ({ totalInvestment: 0, attributedInvestment: 0, unattributedInvestment: 0, attributionPercent: null, unattributedCount: 0, unattributedExpenses: [] });

function expenseAttributionRow(row: Record<string, unknown>, campaigns: Map<string, Campaign>): CampaignExpenseAttributionRow {
  const campaignId = txt(row.campaign_id);
  return { id: String(row.id), expenseDate: String(row.expense_date || ""), description: String(row.description || "Despesa de tráfego"), amount: Number(row.amount || 0), category: String(row.category || "traffic"), source: txt(row.source), campaignId, campaignName: campaignId ? campaigns.get(campaignId)?.name : undefined };
}

function attributionFor(expenses: Record<string, unknown>[], campaigns: Map<string, Campaign>): CampaignAttributionSummary {
  const totalInvestment = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const attributedInvestment = expenses.filter((expense) => Boolean(expense.campaign_id)).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const unattributedExpenses = expenses.filter((expense) => !expense.campaign_id).map((expense) => expenseAttributionRow(expense, campaigns)).sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
  return { totalInvestment, attributedInvestment, unattributedInvestment: Math.max(0, totalInvestment - attributedInvestment), attributionPercent: totalInvestment > 0 ? (attributedInvestment / totalInvestment) * 100 : null, unattributedCount: unattributedExpenses.length, unattributedExpenses };
}

function breakdown(rows: Array<Record<string, unknown>>, keyOf: (row: Record<string, unknown>) => string, totalSales: number): CampaignBreakdownRow[] {
  const groups = new Map<string, Array<Record<string, unknown>>>();
  rows.forEach((row) => { const key = keyOf(row) || "Não informado"; groups.set(key, [...(groups.get(key) || []), row]); });
  return Array.from(groups.entries()).map(([key, sales]) => {
    const grossRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    const operationRevenue = sales.reduce((sum, sale) => sum + operationRevenueForCampaignSale({ totalAmount: Number(sale.total_amount || 0), operationCommissionAmount: sale.operation_commission_amount == null ? null : Number(sale.operation_commission_amount), operationCommissionPercent: sale.operation_commission_percent == null ? null : Number(sale.operation_commission_percent) }), 0);
    return { key, label: key, sales: sales.length, grossRevenue, operationRevenue, sellerCommission: sales.reduce((sum, sale) => sum + Number(sale.commission_amount || 0), 0), averageTicket: sales.length ? grossRevenue / sales.length : null, sharePercent: totalSales ? (sales.length / totalSales) * 100 : 0 };
  }).sort((a, b) => b.sales - a.sales);
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const empty = calculateCampaignMetrics(0, []);
  const emptyResponse = (): CampaignPerformanceResponse => ({ setupRequired: true, summary: empty, attribution: emptyAttribution(), campaigns: [], byState: [], byOrigin: [], bySeller: [], filters: { accounts: [], campaigns: [], products: [], origins: [], sellers: [], states: [] } });
  if (!hasSupabaseAdminConfig()) return NextResponse.json(emptyResponse());

  const url = new URL(request.url);
  const today = new Date();
  const defaultEnd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const start = isoDate(url.searchParams.get("start"), `${defaultEnd.slice(0, 7)}-01`);
  const end = isoDate(url.searchParams.get("end"), defaultEnd);
  const admin = getSupabaseAdminClient();
  const [accountResult, campaignResult, initialSaleResult, expenseResult] = await Promise.all([
    admin.from("ad_accounts").select("*").eq("company_id", auth.companyId).order("name"),
    admin.from("campaigns").select("*").eq("company_id", auth.companyId).order("name"),
    admin.from("sales").select("id,campaign_id,total_amount,operation_commission_amount,operation_commission_percent,commission_amount,payment_status,delivery_status,received_date,order_status,product_name,sale_platform,seller_name,state,created_at").eq("company_id", auth.companyId).is("deleted_at", null).gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59.999`),
    admin.from("expenses").select("id,campaign_id,description,amount,expense_date,category,source").eq("company_id", auth.companyId).eq("category", "traffic").gte("expense_date", start).lte("expense_date", end)
  ]);
  const saleResult = initialSaleResult;
  if (saleResult.error && softDeleteSchemaMissing(saleResult.error)) {
    return NextResponse.json({ error: "O campo deleted_at é necessário para calcular a performance com segurança." }, { status: 409 });
  }
  const error = accountResult.error || campaignResult.error || saleResult.error || expenseResult.error;
  if (error && missing(error)) {
    const fallback = await admin.from("expenses").select("id,description,amount,expense_date,category,source").eq("company_id", auth.companyId).eq("category", "traffic").gte("expense_date", start).lte("expense_date", end);
    if (fallback.error) return NextResponse.json(emptyResponse());
    const historicalTraffic = (fallback.data || []) as Record<string, unknown>[];
    return NextResponse.json({ ...emptyResponse(), attribution: attributionFor(historicalTraffic, new Map()) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const accounts = (accountResult.data || []).map((row) => account(row));
  const accountMap = new Map(accounts.map((item) => [item.id, item]));
  const campaigns = (campaignResult.data || []).map((row) => campaign(row, accountMap));
  const campaignMap = new Map(campaigns.map((item) => [item.id, item]));
  const allTrafficExpenses = (expenseResult.data || []) as Record<string, unknown>[];
  const attribution = attributionFor(allTrafficExpenses, campaignMap);
  const selectedAccount = url.searchParams.get("account") || "all";
  const selectedCampaign = url.searchParams.get("campaign") || "all";
  const selectedPlatform = url.searchParams.get("platform") || "all";
  const selectedProduct = url.searchParams.get("product") || "all";
  const selectedOrigin = url.searchParams.get("origin") || "all";
  const selectedSeller = url.searchParams.get("seller") || "all";
  const selectedState = url.searchParams.get("state") || "all";
  const allowedCampaigns = new Set(campaigns.filter((item) => (selectedAccount === "all" || item.adAccountId === selectedAccount) && (selectedCampaign === "all" || item.id === selectedCampaign) && (selectedPlatform === "all" || item.adPlatform === selectedPlatform) && (selectedProduct === "all" || item.productName === selectedProduct)).map((item) => item.id));
  const salesInPeriod = (saleResult.data || []) as Record<string, unknown>[];
  const validSales = salesInPeriod.filter((sale) => sale.campaign_id && allowedCampaigns.has(String(sale.campaign_id)) && isOperationalSale({ order_status: txt(sale.order_status) }) && (selectedProduct === "all" || sale.product_name === selectedProduct) && (selectedOrigin === "all" || sale.sale_platform === selectedOrigin) && (selectedSeller === "all" || sale.seller_name === selectedSeller) && (selectedState === "all" || sale.state === selectedState));
  const campaignsWithFilteredSales = new Set(validSales.map((sale) => String(sale.campaign_id)));
  const dimensionalFilterActive = [selectedProduct, selectedOrigin, selectedSeller, selectedState].some((value) => value !== "all");
  const attributedExpenses = allTrafficExpenses.filter((expense) => expense.campaign_id && allowedCampaigns.has(String(expense.campaign_id)) && (!dimensionalFilterActive || campaignsWithFilteredSales.has(String(expense.campaign_id))));
  const metricSale = (sale: Record<string, unknown>) => ({ totalAmount: Number(sale.total_amount || 0), operationCommissionAmount: sale.operation_commission_amount == null ? null : Number(sale.operation_commission_amount), operationCommissionPercent: sale.operation_commission_percent == null ? null : Number(sale.operation_commission_percent), commissionAmount: Number(sale.commission_amount || 0), paymentStatus: txt(sale.payment_status), deliveryStatus: txt(sale.delivery_status), receivedDate: txt(sale.received_date) });
  const rows = campaigns.filter((item) => allowedCampaigns.has(item.id)).map((item) => { const itemSales = validSales.filter((sale) => sale.campaign_id === item.id); const investment = attributedExpenses.filter((expense) => expense.campaign_id === item.id).reduce((sum, expense) => sum + Number(expense.amount || 0), 0); return { ...item, ...calculateCampaignMetrics(investment, itemSales.map(metricSale)) }; });
  const investment = attributedExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const summary = calculateCampaignMetrics(investment, validSales.map(metricSale));
  const unique = (key: string) => Array.from(new Set(salesInPeriod.map((row) => txt(row[key])).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  return NextResponse.json({ summary, attribution, campaigns: rows, byState: breakdown(validSales, (row) => txt(row.state) || "Não informada", validSales.length), byOrigin: breakdown(validSales, (row) => txt(row.sale_platform) || "Sem origem", validSales.length), bySeller: breakdown(validSales, (row) => txt(row.seller_name) || "Não informado", validSales.length), filters: { accounts, campaigns, products: Array.from(new Set(campaigns.map((item) => item.productName).filter((value): value is string => Boolean(value)))).sort(), origins: unique("sale_platform"), sellers: unique("seller_name"), states: unique("state") } } satisfies CampaignPerformanceResponse, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
