import { NextResponse } from "next/server";
import { applySellerScopeToBody, forbiddenResponse, isAdmin, isSeller, requireAuth, sellerNameMatches } from "@/lib/auth";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase-server";
import type { SaleInput } from "@/data/sales-types";
import type { UserProfile } from "@/data/user-profile-types";
import { roundMoney } from "@/data/money";

export const dynamic = "force-dynamic";

function toMoney(value: unknown) {
  const number = roundMoney(value);
  if (number === null || !Number.isFinite(number) || number <= 0) return null;
  return number;
}

function toOptionalMoney(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const number = roundMoney(value);
  return number !== null && number >= 0 ? number : null;
}

function toOptionalNonNegativeMoney(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const number = roundMoney(value);
  return number !== null && number >= 0 ? number : null;
}

function toOptionalPositiveInteger(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function cleanState(value: unknown) {
  const state = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(state) ? state : null;
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanPlatform(value: unknown) {
  const platform = String(value || "").toLowerCase().trim();
  return ["payt", "coinzz", "logzz", "manual"].includes(platform) ? platform : null;
}

const orderStatusValues = ["active", "cancelled", "returned", "lost", "review"];
const legacyActiveStatuses = new Set(["confirmed", "paid", "rescheduled", "frustrated", "defaulted", "fraud", ""]);
const orderTagValues = ["hot_customer", "cold_customer", "rescheduled", "frustrated", "fraud", "defaulted", "priority"];

function cleanOrderStatus(value: unknown) {
  const status = String(value || "").toLowerCase().trim();
  if (["cancelled", "canceled", "cancelado", "cancelada"].includes(status)) return "cancelled";
  if (["returned", "devolvido", "devolvida"].includes(status)) return "returned";
  if (["lost", "perdido", "perdida"].includes(status)) return "lost";
  if (["review", "em análise", "em analise", "analise", "análise", "em_analise"].includes(status)) return "review";
  if (orderStatusValues.includes(status)) return status;
  if (legacyActiveStatuses.has(status)) return "active";
  return "active";
}

function cleanOrderTag(value: unknown) {
  const tag = String(value || "").toLowerCase().trim();
  return orderTagValues.includes(tag) ? tag : null;
}

function cleanOrderTags(value: unknown) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  const tags = raw
    .map((item) => cleanOrderTag(item))
    .filter((item): item is string => Boolean(item));
  return Array.from(new Set(tags));
}

function primaryOrderStatus(status: unknown) {
  return cleanOrderStatus(status);
}

const orderStatusMarker = "KAU_ORDER_STATUS";
const orderTagsMarker = "KAU_ORDER_TAGS";

function readOrderStatusMarker(value: unknown) {
  const match = String(value || "").match(/\[KAU_ORDER_STATUS:([^\]]+)\]/i);
  return match ? cleanOrderStatus(match[1]) : undefined;
}

function readOrderTagsMarker(value: unknown) {
  const match = String(value || "").match(/\[KAU_ORDER_TAGS:([^\]]*)\]/i);
  return match ? cleanOrderTags(match[1].split("|")) : [];
}

function stripOrderMarkers(value: unknown) {
  return String(value || "")
    .replace(/\s*\[KAU_ORDER_STATUS:[^\]]+\]/gi, "")
    .replace(/\s*\[KAU_ORDER_TAGS:[^\]]*\]/gi, "")
    .trim();
}

function notesWithOrderFallback(notes: unknown, status: unknown, tags: unknown) {
  const cleanNotes = stripOrderMarkers(notes);
  const safeStatus = primaryOrderStatus(status);
  const safeTags = cleanOrderTags(tags);
  const markers = [`[${orderStatusMarker}:${safeStatus}]`, `[${orderTagsMarker}:${safeTags.join("|")}]`];
  return [cleanNotes, markers.join(" ")].filter(Boolean).join(" ");
}

function removeOrderSchemaFields(payload: Record<string, unknown>) {
  const next = { ...payload };
  delete next.order_status;
  delete next.order_tags;
  delete next.order_status_note;
  return next;
}

function isOrderSchemaError(error: { message?: string } | null | undefined) {
  return /order_status|order_status_note|order_tags|schema cache|column/i.test(String(error?.message || ""));
}

function platformName(value: unknown) {
  const platform = cleanPlatform(value);
  if (platform === "payt") return "Payt";
  if (platform === "coinzz") return "Coinzz";
  if (platform === "logzz") return "Logzz";
  if (platform === "manual") return "Venda Manual";
  return null;
}

function saleDateToTimestamp(value: unknown, timeValue?: unknown) {
  const text = cleanText(value);
  if (!text) return null;
  const time = cleanText(timeValue);
  // When hora da venda exists, keep it in created_at so Sales Arena can read cadencia.
  // Without an explicit hour, use midday UTC to avoid shifting to previous day in browser filters.
  return time ? `${text}T${time.length === 5 ? time : time.slice(0, 5)}:00.000Z` : `${text}T12:00:00.000Z`;
}

function expectedPaymentDateForSale(body: Partial<SaleInput>) {
  const explicitDate = cleanText(body.expectedPaymentDate);
  if (explicitDate) return explicitDate;
  const paymentStatus = String(body.paymentStatus || "").toLowerCase();
  return paymentStatus === "paid" ? cleanText(body.saleDate) : null;
}

function cleanUuid(value: unknown) {
  const id = String(value || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

function normalizeCommissionRate(value: unknown, fallbackPercent = 5) {
  // Store as percent: 15 means 15%. Accept old decimal input too: 0.15 => 15.
  if (value === undefined || value === null || value === "") return Math.round(fallbackPercent * 100) / 100;
  const number = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(number) || number < 0) return Math.round(fallbackPercent * 100) / 100;
  const percent = number <= 1 ? number * 100 : number;
  return Math.round(percent * 100) / 100;
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

function operationCommissionPercent(amount: number | null, total: number, explicit: unknown) {
  if (amount !== null && total > 0) return Math.round((amount / total) * 100 * 10000) / 10000;
  if (explicit === undefined || explicit === null || explicit === "") return null;
  const percent = Number(explicit);
  return Number.isFinite(percent) && percent >= 0 && percent <= 100 ? Math.round(percent * 10000) / 10000 : null;
}

function isSalesEnhancementSchemaError(error: { message?: string } | null | undefined) {
  return /operation_commission_amount|operation_commission_percent|kit_quantity|bottle_quantity|\bstate\b/i.test(String(error?.message || ""));
}

function isSellerManagementSchemaError(error: { message?: string } | null | undefined) {
  return /seller_id|public\.sellers|relation ['"]?sellers/i.test(String(error?.message || ""));
}

function isSalesPlatformConstraintError(error: { message?: string } | null | undefined) {
  return /sales_sale_platform_check|sale_platform.*check constraint/i.test(String(error?.message || ""));
}

function isCampaignSchemaError(error: { code?: string } | null | undefined) {
  return ["42P01", "42703", "PGRST200", "PGRST204", "PGRST205"].includes(String(error?.code || ""));
}

function isSalesSoftDeleteSchemaError(error: { code?: string; message?: string } | null | undefined) {
  return ["42703", "PGRST204"].includes(String(error?.code || ""))
    || /deleted_at|deleted_by/i.test(String(error?.message || ""));
}

function isProductDomainSchemaError(error: { code?: string; message?: string } | null | undefined) {
  return ["42P01", "42703", "PGRST200", "PGRST204"].includes(String(error?.code || ""))
    || /products|product_kits|product_cost_history|product_id|product_kit_id|product_quantity|unit_cost_snapshot|manual_shipping_amount|manual_costs_created_by|schema cache/i.test(String(error?.message || ""));
}

async function resolveManualSaleFields(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  body: Partial<SaleInput>,
  actorId: string,
  companyId: string,
  current?: Record<string, unknown>
) {
  const platform = body.salePlatform !== undefined ? cleanPlatform(body.salePlatform) : cleanPlatform(current?.sale_platform);
  if (platform !== "manual") {
    return {
      fields: {
        product_id: null,
        product_kit_id: null,
        product_quantity: null,
        unit_cost_snapshot: null,
        total_product_cost_snapshot: null,
        manual_shipping_amount: null,
        manual_costs_created_by: null
      }
    } as const;
  }

  const currentPlatform = cleanPlatform(current?.sale_platform);
  const currentProductId = cleanUuid(current?.product_id);
  const currentKitId = cleanUuid(current?.product_kit_id);
  const currentQuantity = toOptionalPositiveInteger(current?.product_quantity);
  const currentSaleDate = String(current?.created_at || "").slice(0, 10);
  const productId = cleanUuid(body.productId !== undefined ? body.productId : current?.product_id);
  const rawShipping = body.manualShippingAmount !== undefined ? body.manualShippingAmount : current?.manual_shipping_amount;
  const shipping = toOptionalNonNegativeMoney(rawShipping);
  if (rawShipping !== undefined && rawShipping !== null && rawShipping !== "" && shipping === null) {
    return { error: "Informe um frete válido, maior ou igual a zero." } as const;
  }
  if (!productId) {
    if (currentPlatform !== "manual" || currentProductId || (shipping !== null && shipping > 0)) {
      return { error: "Selecione um produto para a Venda Manual." } as const;
    }
    // Venda Manual anterior ao catálogo: uma edição operacional não recebe
    // produto, custo ou obrigação inventados. O admin pode completar depois.
    return {
      fields: {
        product_id: null,
        product_kit_id: null,
        product_quantity: null,
        unit_cost_snapshot: null,
        total_product_cost_snapshot: null,
        manual_shipping_amount: null,
        manual_costs_created_by: actorId
      }
    } as const;
  }

  const product = await supabase.from("products").select("id,name,status,available_for_new_sales").eq("company_id", companyId).eq("id", productId).maybeSingle();
  if (product.error) return { error: isProductDomainSchemaError(product.error) ? "A migration 034 precisa ser aplicada para usar custos da Venda Manual." : product.error.message, setupRequired: isProductDomainSchemaError(product.error) } as const;
  if (!product.data) return { error: "Produto não encontrado." } as const;
  const productChanged = currentPlatform !== "manual" || currentProductId !== productId;
  if (!(product.data.status === "active" && product.data.available_for_new_sales === true) && productChanged) return { error: "O produto selecionado não está ativo." } as const;

  const kitId = cleanUuid(body.productKitId !== undefined ? body.productKitId : current?.product_kit_id);
  let quantity = toOptionalPositiveInteger(body.productQuantity !== undefined ? body.productQuantity : current?.product_quantity);
  if (kitId) {
    const kit = await supabase.from("product_kits").select("id,product_id,quantity,is_active").eq("company_id", companyId).eq("id", kitId).maybeSingle();
    if (kit.error) return { error: isProductDomainSchemaError(kit.error) ? "A migration 034 precisa ser aplicada para usar kits." : kit.error.message, setupRequired: isProductDomainSchemaError(kit.error) } as const;
    if (!kit.data || String(kit.data.product_id) !== productId) return { error: "O kit selecionado não pertence a este produto." } as const;
    const kitChanged = currentPlatform !== "manual" || currentKitId !== kitId || productChanged;
    if (!kit.data.is_active && kitChanged) return { error: "O kit selecionado não está ativo para este produto." } as const;
    if (kitChanged) quantity = Number(kit.data.quantity);
  }
  if (!quantity) return { error: "Informe uma quantidade válida para o produto." } as const;

  const saleDate = cleanText(body.saleDate) || currentSaleDate || new Date().toISOString().slice(0, 10);
  const snapshotChanged = currentPlatform !== "manual"
    || productChanged
    || currentKitId !== kitId
    || currentQuantity !== quantity
    || currentSaleDate !== saleDate;
  if (snapshotChanged) {
    const cost = await supabase.from("product_cost_history").select("unit_cost,effective_from").eq("company_id", companyId).eq("product_id", productId).lte("effective_from", saleDate).order("effective_from", { ascending: false }).limit(1).maybeSingle();
    if (cost.error) return { error: isProductDomainSchemaError(cost.error) ? "A migration 034 precisa ser aplicada para consultar custos do produto." : cost.error.message, setupRequired: isProductDomainSchemaError(cost.error) } as const;
    if (!cost.data) return { error: "Este produto não possui custo configurado para a data da venda." } as const;
  }

  return {
    fields: {
      product_id: productId,
      product_kit_id: kitId,
      product_quantity: quantity,
      manual_shipping_amount: shipping,
      manual_costs_created_by: actorId
    }
  } as const;
}

async function validateCampaign(supabase: ReturnType<typeof getSupabaseServerClient>, companyId: string, value: unknown) {
  if (value === undefined || value === null || value === "") return { campaignId: null } as const;
  const campaignId = cleanUuid(value);
  if (!campaignId) return { error: "Selecione uma campanha válida." } as const;
  const result = await supabase.from("campaigns").select("id,status").eq("company_id", companyId).eq("id", campaignId).maybeSingle();
  if (result.error) {
    console.error("[sales] falha ao validar campanha", { code: result.error.code, message: result.error.message, details: result.error.details, hint: result.error.hint });
    return { error: "Não foi possível vincular a campanha no momento." } as const;
  }
  if (!result.data || result.data.status === "archived") return { error: "A campanha selecionada não está disponível." } as const;
  return { campaignId } as const;
}

async function resolveOperationalSeller(supabase: ReturnType<typeof getSupabaseServerClient>, companyId: string, profile: UserProfile, sellerId?: string | null) {
  let query = supabase.from("sellers").select("id,user_id,full_name,display_name,commission_percent,status,is_owner").eq("company_id", companyId);
  query = isAdmin(profile) ? query.eq("id", sellerId || "") : query.eq("user_id", profile.id);
  const { data, error } = await query.maybeSingle();
  if (error) return { error: isSellerManagementSchemaError(error) ? "A migration 026 precisa ser aplicada para usar o cadastro de vendedores." : error.message } as const;
  if (!data) return { error: "Vendedor não encontrado no cadastro operacional." } as const;
  if (data.status !== "active") return { error: "Este vendedor está inativo e não pode receber novas vendas." } as const;
  return { seller: data } as const;
}

function salesEnhancementSchemaErrorResponse() {
  return NextResponse.json(
    { error: "A migration 025 precisa ser aplicada antes de salvar UF, quantidades separadas e comissão líquida exata." },
    { status: 409 }
  );
}

function normalizeSale(body: Partial<SaleInput>) {
  const totalAmount = toMoney(body.totalAmount);
  const quantity = Number(body.quantity ?? 1);
  const sellerName = cleanText(body.sellerName);
  const commissionRate = normalizeCommissionRate(body.commissionRate, 0);
  const exactOperationCommission = toOptionalMoney(body.operationCommissionAmount);
  const kitQuantity = toOptionalPositiveInteger(body.kitQuantity);
  const bottleQuantity = toOptionalPositiveInteger(body.bottleQuantity);
  const state = cleanState(body.state);
  const receivedDate = cleanText(body.receivedDate);
  const deliveryStatus = receivedDate ? "delivered" : (body.deliveryStatus || "pending");

  if (!cleanText(body.customerName)) return { error: "Informe o nome do cliente." } as const;
  if (!cleanText(body.city)) return { error: "Informe a cidade do cliente." } as const;
  if (body.state && !state) return { error: "Informe uma UF válida com duas letras." } as const;
  if (!totalAmount) return { error: "Informe um valor total valido." } as const;
  if (!Number.isInteger(quantity) || quantity <= 0) return { error: "Informe uma quantidade valida." } as const;
  if (body.kitQuantity != null && kitQuantity === null) return { error: "Informe uma quantidade de kits válida." } as const;
  if (body.bottleQuantity != null && bottleQuantity === null) return { error: "Informe uma quantidade de frascos válida." } as const;
  if (body.operationCommissionAmount != null && exactOperationCommission === null) return { error: "Informe um valor líquido de comissão válido." } as const;
  if (!sellerName) return { error: "Informe o vendedor." } as const;
  if (deliveryStatus === "delivered" && !receivedDate) return { error: "Informe a data em que o cliente recebeu o pedido." } as const;

  return {
    sale: {
      customer_name: cleanText(body.customerName),
      customer_phone: cleanText(body.customerPhone),
      city: cleanText(body.city),
      state,
      product_name: cleanText(body.productName) || "Produto",
      quantity,
      kit_quantity: kitQuantity,
      bottle_quantity: bottleQuantity,
      total_amount: totalAmount,
      operation_commission_amount: exactOperationCommission,
      operation_commission_percent: operationCommissionPercent(exactOperationCommission, totalAmount, body.operationCommissionPercent),
      seller_name: sellerName,
      seller_id: cleanText(body.sellerId),
      sale_platform: cleanPlatform(body.salePlatform),
      ...(body.campaignId ? { campaign_id: cleanUuid(body.campaignId) } : {}),
      commission_rate: commissionRate,
      payment_method: cleanText(body.paymentMethod) || "PAGAMENTO ANTECIPADO",
      payment_status: body.paymentStatus || "pending",
      delivery_type: cleanText(body.deliveryType) || "Entrega padrão",
      delivery_status: deliveryStatus,
      order_status: primaryOrderStatus(body.orderStatus),
      order_tags: cleanOrderTags(body.orderTags),
      order_status_note: cleanText(body.orderStatusNote),
      expected_payment_date: expectedPaymentDateForSale(body),
      received_date: receivedDate,
      payment_date: cleanText(body.paymentDate),
      sale_time: cleanText(body.saleTime),
      notes: cleanText(body.notes),
      ...(cleanText(body.saleDate) ? { created_at: saleDateToTimestamp(body.saleDate, body.saleTime) } : {})
    }
  } as const;
}

function mapSale(row: Record<string, unknown>, exposeCosts = true) {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || undefined,
    city: row.city,
    state: row.state || undefined,
    productName: row.product_name,
    saleDate: String(row.created_at || "").slice(0, 10),
    saleTime: row.sale_time || (String(row.created_at || "").includes("T") ? String(row.created_at).slice(11, 16) : undefined),
    receivedDate: row.received_date || undefined,
    paymentDate: row.payment_date || undefined,
    quantity: Number(row.quantity),
    kitQuantity: row.kit_quantity == null ? null : Number(row.kit_quantity),
    bottleQuantity: row.bottle_quantity == null ? null : Number(row.bottle_quantity),
    totalAmount: Number(row.total_amount),
    operationCommissionAmount: row.operation_commission_amount == null ? null : Number(row.operation_commission_amount),
    operationCommissionPercent: row.operation_commission_percent == null ? null : Number(row.operation_commission_percent),
    sellerName: row.seller_name,
    sellerId: row.seller_id || null,
    salePlatform: row.sale_platform || undefined,
    productId: row.product_id || null,
    productKitId: row.product_kit_id || null,
    productQuantity: row.product_quantity == null ? null : Number(row.product_quantity),
    ...(exposeCosts ? {
      unitCostSnapshot: row.unit_cost_snapshot == null ? null : Number(row.unit_cost_snapshot),
      totalProductCostSnapshot: row.total_product_cost_snapshot == null ? null : Number(row.total_product_cost_snapshot),
      manualShippingAmount: row.manual_shipping_amount == null ? null : Number(row.manual_shipping_amount)
    } : {}),
    campaignId: row.campaign_id || null,
    commissionRate: commissionPercentFromStored(row.commission_rate),
    commissionAmount: row.commission_amount == null ? calculateCommission(row.total_amount, row.commission_rate) : Number(row.commission_amount),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    deliveryType: row.delivery_type,
    deliveryStatus: row.delivery_status,
    orderStatus: cleanOrderStatus(row.order_status || row.status_pedido || readOrderStatusMarker(row.notes)),
    orderTags: Array.isArray(row.order_tags) ? row.order_tags : readOrderTagsMarker(row.notes),
    orderStatusNote: row.order_status_note || undefined,
    expectedPaymentDate: row.expected_payment_date || undefined,
    notes: stripOrderMarkers(row.notes) || undefined,
    deletedAt: row.deleted_at || undefined,
    deletedBy: row.deleted_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function assertSaleAccess(id: string, companyId: string, profile: UserProfile) {
  const supabase = getSupabaseServerClient();
  let result = await supabase.from("sales").select("seller_name,deleted_at").eq("company_id", companyId).eq("id", id).maybeSingle();
  if (result.error && isSalesSoftDeleteSchemaError(result.error)) {
    result = await supabase.from("sales").select("seller_name").eq("company_id", companyId).eq("id", id).maybeSingle();
  }
  const { data } = result;
  if (!data) return false;
  if ("deleted_at" in data && data.deleted_at) return false;
  if (isAdmin(profile)) return true;
  return sellerNameMatches(profile, data.seller_name);
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ configured: false, sales: [] });
  }

  const supabase = getSupabaseServerClient();
  const includeDeletedFinancialHistory = new URL(request.url).searchParams.get("includeDeleted") === "financial";
  let query = supabase.from("sales").select("*").eq("company_id", auth.companyId).order("created_at", { ascending: false }).limit(500);
  if (!includeDeletedFinancialHistory) query = query.is("deleted_at", null);
  if (isSeller(auth.profile)) {
    query = query.eq("seller_name", auth.profile.sellerDisplayName);
  }
  let { data, error } = await query;

  if (error && !includeDeletedFinancialHistory && isSalesSoftDeleteSchemaError(error)) {
    let fallback = supabase.from("sales").select("*").eq("company_id", auth.companyId).order("created_at", { ascending: false }).limit(500);
    if (isSeller(auth.profile)) fallback = fallback.eq("seller_name", auth.profile.sellerDisplayName);
    const fallbackResult = await fallback;
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ configured: true, sales: (data ?? []).map((row) => mapSale(row, isAdmin(auth.profile))) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase ainda nao esta configurado no .env.local." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null) ?? {}) as Partial<SaleInput>;
  if (body.salePlatform !== undefined && body.salePlatform !== null && body.salePlatform !== "" && !cleanPlatform(body.salePlatform)) {
    return NextResponse.json({ error: "Selecione uma plataforma de venda válida." }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  const campaign = await validateCampaign(supabase, auth.companyId, body.campaignId);
  if ("error" in campaign) return NextResponse.json({ error: campaign.error }, { status: 409 });
  const resolvedSeller = await resolveOperationalSeller(supabase, auth.companyId, auth.profile, body.sellerId);
  if ("error" in resolvedSeller) return NextResponse.json({ error: resolvedSeller.error }, { status: 409 });
  const seller = resolvedSeller.seller;
  const normalized = normalizeSale({
    ...applySellerScopeToBody(auth.profile, body),
    sellerId: String(seller.id),
    sellerName: String(seller.display_name || seller.full_name),
    commissionRate: seller.is_owner ? 0 : Number(seller.commission_percent || 0)
  });

  if ("error" in normalized) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  let manualFields: Record<string, unknown> = {};
  if (normalized.sale.sale_platform === "manual") {
    const manual = await resolveManualSaleFields(supabase, body, auth.user.id, auth.companyId);
    if ("error" in manual) {
      const setupRequired = "setupRequired" in manual && Boolean(manual.setupRequired);
      return NextResponse.json({ error: manual.error, setupRequired }, { status: setupRequired ? 409 : 400 });
    }
    manualFields = manual.fields;
  }
  const insertPayload: Record<string, unknown> = { ...normalized.sale, ...manualFields, company_id: auth.companyId };
  if (campaign.campaignId) insertPayload.campaign_id = campaign.campaignId;
  let { data, error } = await supabase
    .from("sales")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    if (isSellerManagementSchemaError(error)) {
      return NextResponse.json({ error: "A migration 026 precisa ser aplicada antes de vincular vendedores às vendas." }, { status: 409 });
    } else if (isSalesPlatformConstraintError(error)) {
      return NextResponse.json({ error: "A migration 029 precisa ser aplicada antes de usar Venda Manual." }, { status: 409 });
    } else if (isCampaignSchemaError(error)) {
      console.error("[sales] estrutura de campanha indisponível ao criar venda", { code: error.code, message: error.message, details: error.details, hint: error.hint });
      return NextResponse.json({ error: "Não foi possível vincular a campanha no momento." }, { status: 409 });
    } else if (isProductDomainSchemaError(error)) {
      return NextResponse.json({ error: "A migration 034 precisa ser aplicada antes de registrar custos da Venda Manual.", setupRequired: true }, { status: 409 });
    } else if (isSalesEnhancementSchemaError(error)) {
      return salesEnhancementSchemaErrorResponse();
    } else if (isOrderSchemaError(error)) {
      const fallbackPayload = removeOrderSchemaFields(insertPayload);
      fallbackPayload.notes = notesWithOrderFallback(normalized.sale.notes, normalized.sale.order_status, normalized.sale.order_tags);
      const fallback = await supabase
        .from("sales")
        .insert(fallbackPayload)
        .select("*")
        .single();
      if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      data = fallback.data;
      error = null;
    } else {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Toda venda nova também vira um lead operacional.
  // Isso mantém o funil vivo sem exigir cadastro manual duplicado.
  // Se a tabela leads ainda não existir ou a policy não estiver aplicada,
  // a venda continua salva normalmente e o erro do lead é ignorado.
  await supabase.from("leads").insert({
    company_id: auth.companyId,
    customer_name: normalized.sale.customer_name,
    customer_phone: normalized.sale.customer_phone || "Sem telefone",
    city: normalized.sale.city,
    product_name: normalized.sale.product_name || "Produto",
    temperature: "hot",
    contact_status: "sold",
    priority: "high",
    seller_name: normalized.sale.seller_name,
    next_action: "Venda lançada. Acompanhar pagamento, entrega e recebimento.",
    estimated_value: normalized.sale.total_amount,
    source: platformName(normalized.sale.sale_platform) ? `Venda KAU · ${platformName(normalized.sale.sale_platform)}` : "Venda KAU",
    notes: normalized.sale.notes || "Lead criado automaticamente a partir de uma venda lançada."
  });

  return NextResponse.json({ sale: mapSale(data, isAdmin(auth.profile)) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase ainda nao esta configurado no .env.local." }, { status: 503 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Informe o id da venda para atualizar." }, { status: 400 });
  }

  if (!(await assertSaleAccess(id, auth.companyId, auth.profile))) {
    return forbiddenResponse("Você não pode editar esta venda.");
  }

  const body = applySellerScopeToBody(auth.profile, (await request.json().catch(() => ({}))) as Partial<SaleInput>);
  if (body.salePlatform !== undefined && body.salePlatform !== null && body.salePlatform !== "" && !cleanPlatform(body.salePlatform)) {
    return NextResponse.json({ error: "Selecione uma plataforma de venda válida." }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  const currentDelivery = await supabase.from("sales").select("received_date,delivery_status,seller_id,sale_platform,created_at").eq("company_id", auth.companyId).eq("id", id).maybeSingle();
  if (currentDelivery.error) return NextResponse.json({ error: "Não foi possível consultar os dados de entrega da venda." }, { status: 500 });
  if (!currentDelivery.data) return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 });
  const updates: Record<string, unknown> = {};

  if (body.customerName !== undefined) updates.customer_name = cleanText(body.customerName);
  if (body.customerPhone !== undefined) updates.customer_phone = cleanText(body.customerPhone);
  if (body.city !== undefined) updates.city = cleanText(body.city);
  if (body.state !== undefined) {
    const state = cleanState(body.state);
    if (body.state && !state) return NextResponse.json({ error: "Informe uma UF válida com duas letras." }, { status: 400 });
    updates.state = state;
  }
  if (body.productName !== undefined) updates.product_name = cleanText(body.productName) || "Produto";
  if (body.saleDate !== undefined || body.saleTime !== undefined) updates.created_at = saleDateToTimestamp(body.saleDate, body.saleTime) || new Date().toISOString();
  if (body.quantity !== undefined) {
    const quantity = Number(body.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Informe uma quantidade valida." }, { status: 400 });
    }
    updates.quantity = quantity;
  }
  if (body.kitQuantity !== undefined) {
    const quantity = toOptionalPositiveInteger(body.kitQuantity);
    if (body.kitQuantity !== null && quantity === null) return NextResponse.json({ error: "Informe uma quantidade de kits válida." }, { status: 400 });
    updates.kit_quantity = quantity;
  }
  if (body.bottleQuantity !== undefined) {
    const quantity = toOptionalPositiveInteger(body.bottleQuantity);
    if (body.bottleQuantity !== null && quantity === null) return NextResponse.json({ error: "Informe uma quantidade de frascos válida." }, { status: 400 });
    updates.bottle_quantity = quantity;
  }
  if (body.totalAmount !== undefined) {
    const totalAmount = toMoney(body.totalAmount);
    if (!totalAmount) {
      return NextResponse.json({ error: "Informe um valor total valido." }, { status: 400 });
    }
    updates.total_amount = totalAmount;
  }
  if (body.operationCommissionAmount !== undefined) {
    const amount = toOptionalMoney(body.operationCommissionAmount);
    if (body.operationCommissionAmount !== null && amount === null) return NextResponse.json({ error: "Informe um valor líquido de comissão válido." }, { status: 400 });
    updates.operation_commission_amount = amount;
    const total = Number(updates.total_amount ?? body.totalAmount ?? 0);
    updates.operation_commission_percent = operationCommissionPercent(amount, total, body.operationCommissionPercent);
  } else if (body.operationCommissionPercent !== undefined) {
    updates.operation_commission_percent = operationCommissionPercent(null, 0, body.operationCommissionPercent);
  }
  if (body.sellerName !== undefined) {
    const sellerName = cleanText(body.sellerName);
    if (!sellerName) {
      return NextResponse.json({ error: "Informe o vendedor." }, { status: 400 });
    }
    updates.seller_name = sellerName;
  }
  if (body.sellerId !== undefined && String(body.sellerId || "") !== String(currentDelivery.data.seller_id || "")) {
    const resolvedSeller = await resolveOperationalSeller(supabase, auth.companyId, auth.profile, cleanText(body.sellerId));
    if ("error" in resolvedSeller) return NextResponse.json({ error: resolvedSeller.error }, { status: 409 });
    updates.seller_id = resolvedSeller.seller.id;
    updates.seller_name = resolvedSeller.seller.display_name || resolvedSeller.seller.full_name;
    updates.commission_rate = resolvedSeller.seller.is_owner ? 0 : Number(resolvedSeller.seller.commission_percent || 0);
  }
  if (body.salePlatform !== undefined) updates.sale_platform = cleanPlatform(body.salePlatform);
  if (body.salePlatform === "manual" || currentDelivery.data.sale_platform === "manual") {
    let currentManual: Record<string, unknown> = { ...currentDelivery.data };
    let canResolveManualFields = true;
    if (currentDelivery.data.sale_platform === "manual") {
      const currentProduct = await supabase.from("sales").select("product_id,product_kit_id,product_quantity,unit_cost_snapshot,total_product_cost_snapshot,manual_shipping_amount,manual_costs_created_by").eq("company_id", auth.companyId).eq("id", id).maybeSingle();
      if (currentProduct.error) {
        if (isProductDomainSchemaError(currentProduct.error)) {
          const requestsNewCostData = Boolean(
            cleanUuid(body.productId)
            || cleanUuid(body.productKitId)
            || toOptionalPositiveInteger(body.productQuantity)
            || (body.manualShippingAmount !== undefined && body.manualShippingAmount !== null)
          );
          if (requestsNewCostData) {
            return NextResponse.json({ error: "A migration 034 precisa ser aplicada para editar custos da Venda Manual.", setupRequired: true }, { status: 409 });
          }
          // Antes da 034, vendas manuais legadas continuam editáveis em seus
          // campos operacionais; nenhum custo novo é inferido ou persistido.
          canResolveManualFields = false;
        } else {
          return NextResponse.json({ error: "Não foi possível consultar os custos atuais da venda." }, { status: 500 });
        }
      } else {
        currentManual = { ...currentManual, ...(currentProduct.data || {}) };
      }
    }
    if (canResolveManualFields) {
      const manual = await resolveManualSaleFields(supabase, body, auth.user.id, auth.companyId, currentManual);
      if ("error" in manual) {
        const setupRequired = "setupRequired" in manual && Boolean(manual.setupRequired);
        return NextResponse.json({ error: manual.error, setupRequired }, { status: setupRequired ? 409 : 400 });
      }
      Object.assign(updates, manual.fields);
    }
  }
  if (body.campaignId !== undefined) {
    const campaign = await validateCampaign(supabase, auth.companyId, body.campaignId);
    if ("error" in campaign) return NextResponse.json({ error: campaign.error }, { status: 409 });
    updates.campaign_id = campaign.campaignId;
  }
  if (body.paymentMethod !== undefined) updates.payment_method = cleanText(body.paymentMethod) || "PAGAMENTO ANTECIPADO";
  if (body.paymentStatus) updates.payment_status = body.paymentStatus;
  if (body.deliveryType !== undefined) updates.delivery_type = cleanText(body.deliveryType) || "Entrega padrão";
  if (body.orderStatus !== undefined) updates.order_status = primaryOrderStatus(body.orderStatus);
  if (body.orderTags !== undefined) updates.order_tags = cleanOrderTags(body.orderTags);
  if (body.orderStatusNote !== undefined) updates.order_status_note = cleanText(body.orderStatusNote);
  if (body.expectedPaymentDate !== undefined) updates.expected_payment_date = cleanText(body.expectedPaymentDate);
  if (body.receivedDate !== undefined || body.deliveryStatus !== undefined) {
    const receivedDate = body.receivedDate !== undefined ? cleanText(body.receivedDate) : cleanText(currentDelivery.data.received_date);
    const deliveryStatus = receivedDate ? "delivered" : (body.deliveryStatus || currentDelivery.data.delivery_status || "pending");
    if (deliveryStatus === "delivered" && !receivedDate) {
      return NextResponse.json({ error: "Informe a data em que o cliente recebeu o pedido." }, { status: 400 });
    }
    if (body.receivedDate !== undefined) updates.received_date = receivedDate;
    updates.delivery_status = deliveryStatus;
  }
  if (body.paymentDate !== undefined) updates.payment_date = cleanText(body.paymentDate);
  if (body.saleTime !== undefined) updates.sale_time = cleanText(body.saleTime);
  if (body.notes !== undefined) updates.notes = cleanText(body.notes);
  updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: "Nenhuma atualizacao enviada." }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = { ...updates };
  let { data, error } = await supabase
    .from("sales")
    .update(updatePayload)
    .eq("company_id", auth.companyId)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (isSellerManagementSchemaError(error)) {
      return NextResponse.json({ error: "A migration 026 precisa ser aplicada antes de vincular vendedores às vendas." }, { status: 409 });
    } else if (isSalesPlatformConstraintError(error)) {
      return NextResponse.json({ error: "A migration 029 precisa ser aplicada antes de usar Venda Manual." }, { status: 409 });
    } else if (isCampaignSchemaError(error)) {
      console.error("[sales] estrutura de campanha indisponível ao atualizar venda", { code: error.code, message: error.message, details: error.details, hint: error.hint });
      return NextResponse.json({ error: "Não foi possível vincular a campanha no momento." }, { status: 409 });
    } else if (isProductDomainSchemaError(error)) {
      return NextResponse.json({ error: "A migration 034 precisa ser aplicada antes de salvar custos da Venda Manual.", setupRequired: true }, { status: 409 });
    } else if (isSalesEnhancementSchemaError(error)) {
      return salesEnhancementSchemaErrorResponse();
    } else if (isOrderSchemaError(error)) {
      const fallbackPayload = removeOrderSchemaFields(updatePayload);
      if (body.orderStatus !== undefined || body.orderTags !== undefined) {
        const current = await supabase.from("sales").select("notes").eq("company_id", auth.companyId).eq("id", id).single();
        fallbackPayload.notes = notesWithOrderFallback(
          body.notes !== undefined ? body.notes : current.data?.notes,
          body.orderStatus,
          body.orderTags
        );
      }
      const fallback = await supabase
        .from("sales")
        .update(fallbackPayload)
        .eq("company_id", auth.companyId)
        .eq("id", id)
        .select("*")
        .single();
      if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      data = fallback.data;
      error = null;
    } else {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ sale: mapSale(data, isAdmin(auth.profile)) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase ainda nao esta configurado no .env.local." }, { status: 503 });
  }

  const url = new URL(request.url);
  const id = cleanUuid(url.searchParams.get("id"));

  if (!id) {
    return NextResponse.json({ error: "Informe um id de venda válido para excluir." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const saleLookup = await supabase.from("sales").select("id,seller_name,deleted_at").eq("company_id", auth.companyId).eq("id", id).maybeSingle();

  if (saleLookup.error) {
    if (isSalesSoftDeleteSchemaError(saleLookup.error)) {
      return NextResponse.json(
        { error: "A migration 033 precisa ser aplicada para ativar a exclusão operacional de vendas.", setupRequired: true },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Não foi possível consultar a venda antes da exclusão." }, { status: 500 });
  }

  if (!saleLookup.data || saleLookup.data.deleted_at) {
    return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 });
  }

  if (!isAdmin(auth.profile) && !sellerNameMatches(auth.profile, saleLookup.data.seller_name)) {
    return forbiddenResponse("Você não pode excluir esta venda.");
  }

  const deletedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("sales")
    .update({ deleted_at: deletedAt, deleted_by: auth.user.id })
    .eq("company_id", auth.companyId)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    if (isSalesSoftDeleteSchemaError(error)) {
      return NextResponse.json(
        { error: "A migration 033 precisa ser aplicada para ativar a exclusão operacional de vendas.", setupRequired: true },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Não foi possível excluir a venda." }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 });
  }

  return NextResponse.json(
    { ok: true, deletedId: id, deletedAt },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
