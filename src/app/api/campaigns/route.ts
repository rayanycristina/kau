import { NextResponse } from "next/server";
import type { AdAccount, AdPlatform, Campaign, CampaignStatus } from "@/data/campaign-types";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
const platforms: AdPlatform[] = ["Meta Ads", "Google Ads", "TikTok Ads", "Outros"];
const campaignStatuses: CampaignStatus[] = ["active", "paused", "archived"];

function text(value: unknown) { return typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, " ") : null; }
function date(value: unknown) { const result = text(value); return result && /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null; }
function uuid(value: unknown) { const result = text(value); return result && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result) ? result : null; }
function missing(error: { code?: string; message?: string } | null) { return error?.code === "42P01" || /ad_accounts|campaigns|schema cache/i.test(String(error?.message || "")); }
const validAccountStatuses = ["active", "inactive"] as const;

async function findAccount(admin: ReturnType<typeof getSupabaseAdminClient>, companyId: string, id: string) {
  return admin.from("ad_accounts").select("id,name,platform,status").eq("company_id", companyId).eq("id", id).maybeSingle();
}

function mapAccount(row: Record<string, unknown>): AdAccount {
  return { id: String(row.id), name: String(row.name), platform: row.platform as AdPlatform, externalAccountId: text(row.external_account_id) || undefined, status: row.status === "inactive" ? "inactive" : "active", createdAt: text(row.created_at) || undefined, updatedAt: text(row.updated_at) || undefined };
}

function mapCampaign(row: Record<string, unknown>): Campaign {
  const account = Array.isArray(row.ad_accounts) ? row.ad_accounts[0] as Record<string, unknown> | undefined : row.ad_accounts as Record<string, unknown> | undefined;
  return { id: String(row.id), name: String(row.name), adAccountId: text(row.ad_account_id) || undefined, adAccountName: account ? String(account.name) : undefined, adPlatform: row.ad_platform as AdPlatform, productName: text(row.product_name) || undefined, status: row.status as CampaignStatus, externalCampaignId: text(row.external_campaign_id) || undefined, startDate: text(row.start_date) || undefined, endDate: text(row.end_date) || undefined, notes: text(row.notes) || undefined, createdAt: text(row.created_at) || undefined, updatedAt: text(row.updated_at) || undefined };
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ accounts: [], campaigns: [], setupRequired: true });
  const admin = getSupabaseAdminClient();
  const status = new URL(request.url).searchParams.get("status");
  const [accountsResult, campaignsResult] = await Promise.all([
    admin.from("ad_accounts").select("*").eq("company_id", auth.companyId).order("name"),
    (() => { let query = admin.from("campaigns").select("*,ad_accounts(name)").eq("company_id", auth.companyId).order("created_at", { ascending: false }); if (status === "active") query = query.eq("status", "active"); return query; })()
  ]);
  const error = accountsResult.error || campaignsResult.error;
  if (error && missing(error)) return NextResponse.json({ accounts: [], campaigns: [], setupRequired: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: (accountsResult.data || []).map((row) => mapAccount(row)), campaigns: (campaignsResult.data || []).map((row) => mapCampaign(row)), setupRequired: false }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const kind = body.kind === "account" ? "account" : "campaign";
  const name = text(body.name);
  if (!name || name.length > 100) return NextResponse.json({ error: "Informe um nome válido." }, { status: 400 });
  const admin = getSupabaseAdminClient();
  if (kind === "account") {
    const platform = platforms.includes(body.platform) ? body.platform as AdPlatform : null;
    if (!platform) return NextResponse.json({ error: "Selecione uma plataforma de anúncio válida." }, { status: 400 });
    const result = await admin.from("ad_accounts").insert({ company_id: auth.companyId, name, platform, external_account_id: text(body.externalAccountId), status: "active", created_by: auth.user.id }).select("*").single();
    if (result.error && missing(result.error)) return NextResponse.json({ error: "A migration 031 precisa ser aplicada para ativar Campanhas.", setupRequired: true }, { status: 409 });
    if (result.error?.code === "23505") return NextResponse.json({ error: "Já existe uma conta com esse nome e plataforma." }, { status: 409 });
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    return NextResponse.json({ account: mapAccount(result.data) }, { status: 201 });
  }
  const adPlatform = platforms.includes(body.adPlatform) ? body.adPlatform as AdPlatform : null;
  const adAccountId = uuid(body.adAccountId);
  const status = campaignStatuses.includes(body.status) ? body.status as CampaignStatus : "active";
  const startDate = date(body.startDate);
  const endDate = date(body.endDate);
  if (!adPlatform) return NextResponse.json({ error: "Selecione uma plataforma de anúncio válida." }, { status: 400 });
  if (endDate && startDate && endDate < startDate) return NextResponse.json({ error: "A data final não pode ser anterior à data inicial." }, { status: 400 });
  if (body.adAccountId && !adAccountId) return NextResponse.json({ error: "Selecione uma conta de anúncio válida." }, { status: 400 });
  if (adAccountId) {
    const accountResult = await findAccount(admin, auth.companyId, adAccountId);
    if (accountResult.error) return NextResponse.json({ error: accountResult.error.message }, { status: 500 });
    if (!accountResult.data) return NextResponse.json({ error: "Conta de anúncio não encontrada." }, { status: 404 });
    if (accountResult.data.status !== "active") return NextResponse.json({ error: "Selecione uma conta de anúncio ativa." }, { status: 409 });
    if (accountResult.data.platform !== adPlatform) return NextResponse.json({ error: "A plataforma da campanha deve ser a mesma da conta de anúncio." }, { status: 409 });
  }
  const result = await admin.from("campaigns").insert({ company_id: auth.companyId, name, ad_account_id: adAccountId, ad_platform: adPlatform, product_name: text(body.productName), status, external_campaign_id: text(body.externalCampaignId), start_date: startDate, end_date: endDate, notes: text(body.notes), created_by: auth.user.id }).select("*,ad_accounts(name)").single();
  if (result.error && missing(result.error)) return NextResponse.json({ error: "A migration 031 precisa ser aplicada para ativar Campanhas.", setupRequired: true }, { status: 409 });
  if (result.error?.code === "23505") return NextResponse.json({ error: "Já existe uma campanha com esse nome nesta conta." }, { status: 409 });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ campaign: mapCampaign(result.data) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const id = uuid(body.id);
  if (!id) return NextResponse.json({ error: "Informe um registro válido." }, { status: 400 });
  const admin = getSupabaseAdminClient();
  if (body.kind === "account") {
    const currentResult = await findAccount(admin, auth.companyId, id);
    if (currentResult.error) return NextResponse.json({ error: currentResult.error.message }, { status: 500 });
    if (!currentResult.data) return NextResponse.json({ error: "Conta de anúncio não encontrada." }, { status: 404 });
    const name = body.name === undefined ? String(currentResult.data.name) : text(body.name);
    const platform = body.platform === undefined ? currentResult.data.platform as AdPlatform : platforms.includes(body.platform) ? body.platform as AdPlatform : null;
    const status = body.status === undefined ? currentResult.data.status : validAccountStatuses.includes(body.status) ? body.status : null;
    if (!name || name.length > 100) return NextResponse.json({ error: "Informe um nome válido para a conta." }, { status: 400 });
    if (!platform) return NextResponse.json({ error: "Selecione uma plataforma de anúncio válida." }, { status: 400 });
    if (!status) return NextResponse.json({ error: "Selecione um status válido para a conta." }, { status: 400 });
    if (platform !== currentResult.data.platform) {
      const linked = await admin.from("campaigns").select("id").eq("company_id", auth.companyId).eq("ad_account_id", id).limit(1);
      if (linked.error) return NextResponse.json({ error: linked.error.message }, { status: 500 });
      if ((linked.data || []).length) return NextResponse.json({ error: "A plataforma não pode ser alterada enquanto a conta possuir campanhas vinculadas." }, { status: 409 });
    }
    const updates = { name, platform, status, ...(body.externalAccountId !== undefined ? { external_account_id: text(body.externalAccountId) } : {}) };
    const result = await admin.from("ad_accounts").update(updates).eq("company_id", auth.companyId).eq("id", id).select("*").maybeSingle();
    if (result.error?.code === "23505") return NextResponse.json({ error: "Já existe uma conta com esse nome e plataforma." }, { status: 409 });
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    if (!result.data) return NextResponse.json({ error: "Conta de anúncio não encontrada." }, { status: 404 });
    return NextResponse.json({ account: mapAccount(result.data) });
  }

  const currentResult = await admin.from("campaigns").select("id,name,ad_account_id,ad_platform,product_name,status,external_campaign_id,start_date,end_date,notes").eq("company_id", auth.companyId).eq("id", id).maybeSingle();
  if (currentResult.error) return NextResponse.json({ error: currentResult.error.message }, { status: 500 });
  if (!currentResult.data) return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  const name = body.name === undefined ? String(currentResult.data.name) : text(body.name);
  const status = body.status === undefined ? currentResult.data.status as CampaignStatus : campaignStatuses.includes(body.status) ? body.status as CampaignStatus : null;
  const startDate = body.startDate === undefined ? date(currentResult.data.start_date) : date(body.startDate);
  const endDate = body.endDate === undefined ? date(currentResult.data.end_date) : date(body.endDate);
  if (!name || name.length > 100) return NextResponse.json({ error: "Informe um nome válido para a campanha." }, { status: 400 });
  if (!status) return NextResponse.json({ error: "Selecione um status válido para a campanha." }, { status: 400 });
  if (body.startDate && !startDate) return NextResponse.json({ error: "Informe uma data inicial válida." }, { status: 400 });
  if (body.endDate && !endDate) return NextResponse.json({ error: "Informe uma data final válida." }, { status: 400 });
  if (endDate && startDate && endDate < startDate) return NextResponse.json({ error: "A data final não pode ser anterior à data inicial." }, { status: 400 });

  let adAccountId = body.adAccountId === undefined ? uuid(currentResult.data.ad_account_id) : null;
  if (body.adAccountId !== undefined && body.adAccountId !== null && body.adAccountId !== "") {
    adAccountId = uuid(body.adAccountId);
    if (!adAccountId) return NextResponse.json({ error: "Selecione uma conta de anúncio válida." }, { status: 400 });
  }
  let adPlatform = body.adPlatform === undefined ? currentResult.data.ad_platform as AdPlatform : platforms.includes(body.adPlatform) ? body.adPlatform as AdPlatform : null;
  if (!adPlatform) return NextResponse.json({ error: "Selecione uma plataforma de anúncio válida." }, { status: 400 });
  if (adAccountId) {
    const accountResult = await findAccount(admin, auth.companyId, adAccountId);
    if (accountResult.error) return NextResponse.json({ error: accountResult.error.message }, { status: 500 });
    if (!accountResult.data) return NextResponse.json({ error: "Conta de anúncio não encontrada." }, { status: 404 });
    const isCurrentHistoricalAccount = currentResult.data.ad_account_id === adAccountId;
    if (accountResult.data.status !== "active" && !isCurrentHistoricalAccount) return NextResponse.json({ error: "Selecione uma conta de anúncio ativa." }, { status: 409 });
    if (body.adPlatform !== undefined && body.adPlatform !== accountResult.data.platform) return NextResponse.json({ error: "A plataforma da campanha deve ser a mesma da conta de anúncio." }, { status: 409 });
    adPlatform = accountResult.data.platform as AdPlatform;
  }

  const updates = {
    name,
    ad_account_id: adAccountId,
    ad_platform: adPlatform,
    status,
    product_name: body.productName === undefined ? currentResult.data.product_name : text(body.productName),
    external_campaign_id: body.externalCampaignId === undefined ? currentResult.data.external_campaign_id : text(body.externalCampaignId),
    start_date: startDate,
    end_date: endDate,
    notes: body.notes === undefined ? currentResult.data.notes : text(body.notes)
  };
  const result = await admin.from("campaigns").update(updates).eq("company_id", auth.companyId).eq("id", id).select("*,ad_accounts(name)").maybeSingle();
  if (result.error?.code === "23505") return NextResponse.json({ error: "Já existe uma campanha com esse nome nesta conta." }, { status: 409 });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  if (!result.data) return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  return NextResponse.json({ campaign: mapCampaign(result.data) });
}
