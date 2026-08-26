import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";

const businessErrors = [
  "Custo a pagar não encontrado.",
  "Este custo já foi pago.",
  "Este custo não está disponível para pagamento.",
  "O valor confirmado difere do custo pendente. Corrija o custo antes de pagar.",
  "A venda não está operacionalmente válida para pagamento deste custo.",
  "A categoria financeira deste custo não está disponível.",
  "Venda vinculada não encontrada.",
  "Informe data e valor válidos.",
  "Informe data, hora e valor válidos.",
  "Acesso negado"
];

function cleanMoney(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value || "").replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

function cleanPaymentInstant(value: unknown) {
  const instant = typeof value === "string" ? value.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(instant)) return null;
  const parsed = new Date(instant);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function cleanDate(value: unknown) {
  const date = typeof value === "string" ? value.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function dateInBrasilia(instant: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function isMissingTimestampColumn(error: { code?: string; message?: string } | null) {
  return error?.code === "42703"
    || error?.code === "PGRST204"
    || /paid_at_timestamp.*(?:does not exist|schema cache)/i.test(String(error?.message || ""));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const confirmedAmount = cleanMoney(body.confirmedAmount);
  const paidAt = cleanPaymentInstant(body.paidAt);
  const paidDate = cleanDate(body.paidDate);
  if (!confirmedAmount || !paidAt || !paidDate) {
    return NextResponse.json({ error: "Confirme o valor e informe a data e a hora reais do pagamento." }, { status: 400 });
  }
  if (dateInBrasilia(paidAt) !== paidDate) {
    return NextResponse.json(
      { error: "A data e a hora informadas não representam o mesmo dia no horário de Brasília." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdminClient();
  const obligation = await admin.from("manual_sale_cost_obligations").select("id").eq("company_id", auth.companyId).eq("id", id).maybeSingle();
  if (!obligation.data) return NextResponse.json({ error: "Custo a pagar não encontrado." }, { status: 404 });
  const timestampCapability = await admin
    .from("manual_sale_cost_obligations")
    .select("paid_at_timestamp")
    .eq("company_id", auth.companyId)
    .limit(1);
  if (timestampCapability.error && !isMissingTimestampColumn(timestampCapability.error)) {
    console.error("[manual-sale-cost-payment] Falha ao verificar suporte a timestamp", {
      code: timestampCapability.error.code,
      message: timestampCapability.error.message
    });
    return NextResponse.json(
      { error: "Não foi possível validar a estrutura de pagamento da Expedição." },
      { status: 500 }
    );
  }

  const supportsPaymentTimestamp = !timestampCapability.error;
  const { data, error } = await admin.rpc("register_manual_sale_cost_payment", {
    p_obligation_id: id,
    p_confirmed_amount: confirmedAmount,
    p_paid_at: supportsPaymentTimestamp ? paidAt : paidDate,
    p_admin_id: auth.user.id
  });

  if (error) {
    console.error("[manual-sale-cost-payment] RPC recusou o pagamento", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      timestampSignature: supportsPaymentTimestamp
    });
    const knownMessage = businessErrors.find((message) => error.message.includes(message));
    const setupRequired = /register_manual_sale_cost_payment|paid_at_timestamp|schema cache/i.test(error.message);
    return NextResponse.json(
      {
        error: knownMessage || (setupRequired
          ? "A função de pagamento da Expedição está incompatível com a estrutura atual do banco."
          : "Não foi possível registrar o pagamento deste custo."),
        setupRequired,
        errorCode: error.code || undefined
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    result: data,
    paymentTimePersisted: supportsPaymentTimestamp,
    timestampSetupRequired: !supportsPaymentTimestamp
  });
}
