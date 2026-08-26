import { NextResponse } from "next/server";
import { calculateCapitalCycle, type CapitalCycleSale } from "@/data/capital-cycle";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
const text = (value: unknown) => value == null || value === "" ? undefined : String(value);
const date = (value: string | null, fallback: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
const localDate = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; };
const settingsMissing = (error: { code?: string; message?: string } | null) => error?.code === "42P01" || /capital_cycle_settings|schema cache/i.test(String(error?.message || ""));
const campaignSchemaMissing = (error: { code?: string; message?: string } | null) => Boolean(error && /campaign_id|campaigns|schema cache/i.test(String(error.message || "")));
const softDeleteSchemaMissing = (error: { code?: string; message?: string } | null) => ["42703", "PGRST204"].includes(String(error?.code || "")) || /deleted_at/i.test(String(error?.message || ""));
const saleFields = "id,customer_name,customer_phone,created_at,received_date,payment_date,payment_status,delivery_status,order_status,total_amount,operation_commission_amount,operation_commission_percent,sale_platform,state,seller_name";

async function fetchSales(admin: ReturnType<typeof getSupabaseAdminClient>, companyId: string, includeCampaigns: boolean) {
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  const fields: string = includeCampaigns ? `${saleFields},campaign_id,campaigns(name)` : saleFields;
  for (let from = 0; ; from += pageSize) {
    const page = await admin.from("sales").select(fields).eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }).range(from, from + pageSize - 1);
    if (page.error && softDeleteSchemaMissing(page.error)) {
      return { data: rows, error: new Error("O campo deleted_at é necessário para calcular Capital em Giro com segurança.") };
    }
    if (page.error) return { data: rows, error: page.error };
    rows.push(...((page.data || []) as unknown as Record<string, unknown>[]));
    if ((page.data || []).length < pageSize) return { data: rows, error: null };
  }
}

function mapSale(row: Record<string, unknown>): CapitalCycleSale {
  const relation = Array.isArray(row.campaigns) ? row.campaigns[0] : row.campaigns;
  const campaign = (relation || {}) as Record<string, unknown>;
  return {
    id: String(row.id), customerName: String(row.customer_name || "Cliente"), customerPhone: text(row.customer_phone),
    saleDate: text(row.created_at)?.slice(0, 10), deliveryDate: text(row.received_date), paymentDate: text(row.payment_date),
    paymentStatus: text(row.payment_status), deliveryStatus: text(row.delivery_status), orderStatus: text(row.order_status),
    totalAmount: Number(row.total_amount || 0), operationCommissionAmount: row.operation_commission_amount == null ? null : Number(row.operation_commission_amount),
    operationCommissionPercent: row.operation_commission_percent == null ? null : Number(row.operation_commission_percent), origin: text(row.sale_platform),
    state: text(row.state), seller: text(row.seller_name), campaignId: text(row.campaign_id), campaignName: text(campaign.name)
  };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  const url = new URL(request.url); const today = localDate();
  const start = date(url.searchParams.get("start"), `${today.slice(0, 7)}-01`); const end = date(url.searchParams.get("end"), today);
  const admin = getSupabaseAdminClient();
  const [initialSalesResult, settingsResult, campaignsResult] = await Promise.all([
    fetchSales(admin, auth.companyId, true),
    admin.from("capital_cycle_settings").select("delinquency_days_after_delivery").eq("company_id", auth.companyId).eq("id", 1).maybeSingle(),
    admin.from("campaigns").select("id,name,status").eq("company_id", auth.companyId).order("name")
  ]);
  let salesResult = initialSalesResult;
  let campaignSetupRequired = campaignSchemaMissing(campaignsResult.error);
  if (salesResult.error && campaignSchemaMissing(salesResult.error)) {
    salesResult = await fetchSales(admin, auth.companyId, false);
    campaignSetupRequired = true;
  }
  if (salesResult.error) return NextResponse.json({ error: salesResult.error.message }, { status: 500 });
  const settingsSetupRequired = Boolean(settingsResult.error && settingsMissing(settingsResult.error));
  if (settingsResult.error && !settingsSetupRequired) return NextResponse.json({ error: settingsResult.error.message }, { status: 500 });
  if (campaignsResult.error && !campaignSetupRequired) return NextResponse.json({ error: campaignsResult.error.message }, { status: 500 });
  const rows = (salesResult.data || []).map((row) => mapSale(row as Record<string, unknown>));
  const delinquencyDays = settingsResult.data?.delinquency_days_after_delivery == null ? null : Number(settingsResult.data.delinquency_days_after_delivery);
  const result = calculateCapitalCycle(rows, { start, end, referenceDate: today, origin: url.searchParams.get("origin") || "all", state: url.searchParams.get("state") || "all", seller: url.searchParams.get("seller") || "all", campaign: url.searchParams.get("campaign") || "all", delinquencyDaysAfterDelivery: delinquencyDays });
  const unique = (values: Array<string | undefined>) => Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  return NextResponse.json({ ...result, settings: { delinquencyDaysAfterDelivery: delinquencyDays, setupRequired: settingsSetupRequired }, filters: { origins: unique(rows.map((sale) => sale.origin)), states: unique(rows.map((sale) => sale.state)), sellers: unique(rows.map((sale) => sale.seller)), campaigns: campaignSetupRequired ? [] : (campaignsResult.data || []).map((campaign) => ({ id: String(campaign.id), name: String(campaign.name), status: String(campaign.status) })) } }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { delinquencyDaysAfterDelivery?: number | null };
  const raw = body.delinquencyDaysAfterDelivery;
  const value = raw == null ? null : Number(raw);
  if (value !== null && (!Number.isInteger(value) || value <= 0 || value > 3650)) return NextResponse.json({ error: "Informe uma quantidade inteira e positiva de dias." }, { status: 400 });
  const result = await getSupabaseAdminClient().from("capital_cycle_settings").upsert({ company_id: auth.companyId, id: 1, delinquency_days_after_delivery: value, updated_by: auth.user.id }, { onConflict: "company_id,id" }).select("delinquency_days_after_delivery").single();
  if (result.error && settingsMissing(result.error)) return NextResponse.json({ error: "A migration 032 precisa ser aplicada para salvar esta configuração.", setupRequired: true }, { status: 409 });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ delinquencyDaysAfterDelivery: result.data.delinquency_days_after_delivery == null ? null : Number(result.data.delinquency_days_after_delivery) });
}
