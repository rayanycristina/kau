import { NextResponse } from "next/server";
import {
  createRealNetMarginResponse,
  normalizePeriod,
  previousPeriodFor,
  type RealNetMarginExpense,
  type RealNetMarginSale
} from "@/data/real-net-margin";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const pageSize = 1_000;

function saoPauloDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function isMissingFinancialStructure(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "42P01"
    || /expenses|expense_tax_items|operation_commission_amount|payment_date|order_status|deleted_at|schema cache/i.test(String(error?.message ?? ""));
}

async function fetchPaidSales(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  companyId: string,
  start: string,
  end: string
) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("sales")
      .select("id,payment_status,payment_date,operation_commission_amount,order_status,deleted_at")
      .eq("company_id", companyId)
      .eq("payment_status", "paid")
      .is("deleted_at", null)
      .gte("payment_date", start)
      .lte("payment_date", end)
      .order("payment_date", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) return { data: null, error };
    const page = (data ?? []) as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
  }
}

async function fetchPaidSalesWithoutDate(admin: ReturnType<typeof getSupabaseAdminClient>, companyId: string) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("sales")
      .select("id,payment_status,payment_date,operation_commission_amount,order_status,deleted_at")
      .eq("company_id", companyId)
      .eq("payment_status", "paid")
      .is("deleted_at", null)
      .is("payment_date", null)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) return { data: null, error };
    const page = (data ?? []) as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
  }
}

async function fetchExpenses(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  companyId: string,
  start: string,
  end: string
) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("expenses")
      .select("id,description,amount,expense_date,expense_tax_items(id,amount)")
      .eq("company_id", companyId)
      .gte("expense_date", start)
      .lte("expense_date", end)
      .order("expense_date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) return { data: null, error };
    const page = (data ?? []) as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
  }
}

function mapSale(row: Record<string, unknown>): RealNetMarginSale {
  return {
    id: String(row.id),
    paymentStatus: row.payment_status == null ? null : String(row.payment_status),
    paymentDate: row.payment_date == null ? null : String(row.payment_date),
    operationCommissionAmount: row.operation_commission_amount as number | string | null,
    orderStatus: row.order_status == null ? null : String(row.order_status),
    deletedAt: row.deleted_at == null ? null : String(row.deleted_at)
  };
}

function mapExpense(row: Record<string, unknown>): RealNetMarginExpense {
  const taxItems = Array.isArray(row.expense_tax_items)
    ? row.expense_tax_items as Record<string, unknown>[]
    : [];
  return {
    id: String(row.id),
    description: row.description == null ? null : String(row.description),
    amount: row.amount as number | string | null,
    expenseDate: row.expense_date == null ? null : String(row.expense_date),
    taxItems: taxItems.map((tax) => ({ amount: tax.amount as number | string | null }))
  };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase administrativo não configurado." }, { status: 503 });
  }

  const url = new URL(request.url);
  const today = saoPauloDate();
  const requested = normalizePeriod({
    start: url.searchParams.get("start") || `${today.slice(0, 7)}-01`,
    end: url.searchParams.get("end") || today
  });
  if (!requested) {
    return NextResponse.json({ error: "Informe um período válido." }, { status: 400 });
  }

  const previous = previousPeriodFor(requested);
  const admin = getSupabaseAdminClient();
  const [salesResult, undatedSalesResult, expensesResult] = await Promise.all([
    fetchPaidSales(admin, auth.companyId, previous.start, requested.end),
    fetchPaidSalesWithoutDate(admin, auth.companyId),
    fetchExpenses(admin, auth.companyId, previous.start, requested.end)
  ]);
  const error = salesResult.error || undatedSalesResult.error || expensesResult.error;
  if (error) {
    const setupRequired = isMissingFinancialStructure(error);
    return NextResponse.json(
      {
        error: setupRequired
          ? "A estrutura financeira necessária para calcular a Margem Líquida Real ainda não está disponível."
          : "Não foi possível calcular a Margem Líquida Real.",
        setupRequired
      },
      { status: setupRequired ? 409 : 500 }
    );
  }

  const result = createRealNetMarginResponse(
    [...(salesResult.data ?? []), ...(undatedSalesResult.data ?? [])].map(mapSale),
    (expensesResult.data ?? []).map(mapExpense),
    requested
  );

  return NextResponse.json(
    { ...result, generatedAt: new Date().toISOString(), targetMargin: null },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
