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

async function resolveOperationalSeller(supabase: ReturnType<typeof getSupabaseServerClient>, profile: UserProfile, sellerId?: string | null) {
  let query = supabase.from("sellers").select("id,user_id,full_name,display_name,commission_percent,status,is_owner");
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

  if (!cleanText(body.customerName)) return { error: "Informe o nome do cliente." } as const;
  if (!cleanText(body.city)) return { error: "Informe a cidade do cliente." } as const;
  if (body.state && !state) return { error: "Informe uma UF válida com duas letras." } as const;
  if (!totalAmount) return { error: "Informe um valor total valido." } as const;
  if (!Number.isInteger(quantity) || quantity <= 0) return { error: "Informe uma quantidade valida." } as const;
  if (body.kitQuantity != null && kitQuantity === null) return { error: "Informe uma quantidade de kits válida." } as const;
  if (body.bottleQuantity != null && bottleQuantity === null) return { error: "Informe uma quantidade de frascos válida." } as const;
  if (body.operationCommissionAmount != null && exactOperationCommission === null) return { error: "Informe um valor líquido de comissão válido." } as const;
  if (!sellerName) return { error: "Informe o vendedor." } as const;

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
      commission_rate: commissionRate,
      payment_method: cleanText(body.paymentMethod) || "PAGAMENTO ANTECIPADO",
      payment_status: body.paymentStatus || "pending",
      delivery_type: cleanText(body.deliveryType) || "Entrega padrão",
      delivery_status: body.deliveryStatus || "pending",
      order_status: primaryOrderStatus(body.orderStatus),
      order_tags: cleanOrderTags(body.orderTags),
      order_status_note: cleanText(body.orderStatusNote),
      expected_payment_date: expectedPaymentDateForSale(body),
      received_date: cleanText(body.receivedDate),
      payment_date: cleanText(body.paymentDate) || (String(body.paymentStatus || "").toLowerCase() === "paid" ? cleanText(body.saleDate) || String(new Date().toISOString()).slice(0, 10) : null),
      sale_time: cleanText(body.saleTime),
      notes: cleanText(body.notes),
      ...(cleanText(body.saleDate) ? { created_at: saleDateToTimestamp(body.saleDate, body.saleTime) } : {})
    }
  } as const;
}

function mapSale(row: Record<string, unknown>) {
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
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function assertSaleAccess(id: string, profile: UserProfile) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from("sales").select("seller_name").eq("id", id).maybeSingle();
  if (!data) return false;
  if (isAdmin(profile)) return true;
  return sellerNameMatches(profile, data.seller_name);
}

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ configured: false, sales: [] });
  }

  const supabase = getSupabaseServerClient();
  let query = supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(500);
  if (isSeller(auth.profile)) {
    query = query.eq("seller_name", auth.profile.sellerDisplayName);
  }
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ configured: true, sales: (data ?? []).map(mapSale) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase ainda nao esta configurado no .env.local." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null) ?? {}) as Partial<SaleInput>;
  const supabase = getSupabaseServerClient();
  const resolvedSeller = await resolveOperationalSeller(supabase, auth.profile, body.sellerId);
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

  const insertPayload: Record<string, unknown> = { ...normalized.sale };
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

  return NextResponse.json({ sale: mapSale(data) }, { status: 201 });
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

  if (!(await assertSaleAccess(id, auth.profile))) {
    return forbiddenResponse("Você não pode editar esta venda.");
  }

  const body = applySellerScopeToBody(auth.profile, (await request.json().catch(() => ({}))) as Partial<SaleInput>);
  const supabase = getSupabaseServerClient();
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
  if (body.sellerId !== undefined) {
    const resolvedSeller = await resolveOperationalSeller(supabase, auth.profile, cleanText(body.sellerId));
    if ("error" in resolvedSeller) return NextResponse.json({ error: resolvedSeller.error }, { status: 409 });
    updates.seller_id = resolvedSeller.seller.id;
    updates.seller_name = resolvedSeller.seller.display_name || resolvedSeller.seller.full_name;
    updates.commission_rate = resolvedSeller.seller.is_owner ? 0 : Number(resolvedSeller.seller.commission_percent || 0);
  }
  if (body.salePlatform !== undefined) updates.sale_platform = cleanPlatform(body.salePlatform);
  if (body.paymentMethod !== undefined) updates.payment_method = cleanText(body.paymentMethod) || "PAGAMENTO ANTECIPADO";
  if (body.paymentStatus) updates.payment_status = body.paymentStatus;
  if (body.deliveryType !== undefined) updates.delivery_type = cleanText(body.deliveryType) || "Entrega padrão";
  if (body.deliveryStatus) updates.delivery_status = body.deliveryStatus;
  if (body.orderStatus !== undefined) updates.order_status = primaryOrderStatus(body.orderStatus);
  if (body.orderTags !== undefined) updates.order_tags = cleanOrderTags(body.orderTags);
  if (body.orderStatusNote !== undefined) updates.order_status_note = cleanText(body.orderStatusNote);
  if (body.expectedPaymentDate !== undefined) updates.expected_payment_date = cleanText(body.expectedPaymentDate);
  if (body.receivedDate !== undefined) updates.received_date = cleanText(body.receivedDate);
  if (body.paymentDate !== undefined) updates.payment_date = cleanText(body.paymentDate);
  if (body.saleTime !== undefined) updates.sale_time = cleanText(body.saleTime);
  if (body.paymentStatus === "paid" && body.paymentDate === undefined) {
    // Caixa entra na data em que o cliente pagou, nao na data antiga da venda.
    updates.payment_date = String(new Date().toISOString()).slice(0, 10);
  }
  if (body.notes !== undefined) updates.notes = cleanText(body.notes);
  updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: "Nenhuma atualizacao enviada." }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = { ...updates };
  let { data, error } = await supabase
    .from("sales")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (isSellerManagementSchemaError(error)) {
      return NextResponse.json({ error: "A migration 026 precisa ser aplicada antes de vincular vendedores às vendas." }, { status: 409 });
    } else if (isSalesPlatformConstraintError(error)) {
      return NextResponse.json({ error: "A migration 029 precisa ser aplicada antes de usar Venda Manual." }, { status: 409 });
    } else if (isSalesEnhancementSchemaError(error)) {
      return salesEnhancementSchemaErrorResponse();
    } else if (isOrderSchemaError(error)) {
      const fallbackPayload = removeOrderSchemaFields(updatePayload);
      if (body.orderStatus !== undefined || body.orderTags !== undefined) {
        const current = await supabase.from("sales").select("notes").eq("id", id).single();
        fallbackPayload.notes = notesWithOrderFallback(
          body.notes !== undefined ? body.notes : current.data?.notes,
          body.orderStatus,
          body.orderTags
        );
      }
      const fallback = await supabase
        .from("sales")
        .update(fallbackPayload)
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

  return NextResponse.json({ sale: mapSale(data) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase ainda nao esta configurado no .env.local." }, { status: 503 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Informe o id da venda para excluir." }, { status: 400 });
  }

  if (!(await assertSaleAccess(id, auth.profile))) {
    return forbiddenResponse("Você não pode excluir esta venda.");
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sales")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "A venda não foi excluída no Supabase. Execute o SQL supabase/005_sales_delete_policy.sql uma vez e tente novamente." },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, deletedId: id }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
