import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function toMoney(value: unknown) {
  const number = typeof value === "number" ? value : Number(String(value ?? "").replace(/R\$|\s/g, "").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.round(number * 100) / 100;
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanSaleIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 500);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

type CashWithdrawalRow = {
  id?: string;
  amount?: number | string | null;
  withdrawn_at?: string | null;
  note?: string | null;
  sale_ids?: unknown;
  created_at?: string | null;
};

function mapWithdrawal(row: CashWithdrawalRow) {
  return {
    id: row.id || "",
    amount: Number(row.amount || 0),
    withdrawnAt: row.withdrawn_at || todayKey(),
    note: row.note || undefined,
    saleIds: Array.isArray(row.sale_ids) ? row.sale_ids.map((id) => String(id || "").trim()).filter(Boolean) : [],
    createdAt: row.created_at || undefined
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ configured: false, withdrawals: [] });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("cash_withdrawals")
    .select("*")
    .order("withdrawn_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    const message = String(error.message || "");
    if (message.includes("cash_withdrawals") || message.toLowerCase().includes("does not exist")) {
      return NextResponse.json({ configured: true, setupRequired: true, withdrawals: [] }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ configured: true, withdrawals: (data ?? []).map(mapWithdrawal) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase ainda nao esta configurado no .env.local." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const amount = toMoney(body.amount);
  const withdrawnAt = cleanText(body.withdrawnAt) || todayKey();
  const saleIds = cleanSaleIds(body.saleIds);

  if (!amount) {
    return NextResponse.json({ error: "Informe um valor de saque valido." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("cash_withdrawals")
    .insert({
      amount,
      withdrawn_at: withdrawnAt,
      note: cleanText(body.note) || "Saque do caixa",
      sale_ids: saleIds
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ withdrawal: mapWithdrawal(data) }, { status: 201, headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase ainda nao esta configurado no .env.local." }, { status: 503 });
  }

  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = cleanText(url.searchParams.get("id")) || cleanText(body.id);

  if (!id) {
    return NextResponse.json({ error: "Informe o id do saque para atualizar." }, { status: 400 });
  }

  if (body.note === undefined) {
    return NextResponse.json({ error: "Informe o nome/observacao do saque." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("cash_withdrawals")
    .update({ note: cleanText(body.note) || "Saque do caixa" })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Saque nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ withdrawal: mapWithdrawal(data) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
