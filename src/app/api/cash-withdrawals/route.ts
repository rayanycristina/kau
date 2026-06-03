import { NextResponse } from "next/server";
import { forbiddenResponse, isAdmin, isSeller, requireAuth } from "@/lib/auth";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase-server";
import type { UserProfile } from "@/data/user-profile-types";

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

type SaleOwnerRow = {
  id?: string | null;
  seller_name?: string | null;
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

function saleIdsFromWithdrawals(rows: CashWithdrawalRow[]) {
  const ids = new Set<string>();
  rows.forEach((row) => {
    if (!Array.isArray(row.sale_ids)) return;
    row.sale_ids.map((id) => String(id || "").trim()).filter(Boolean).forEach((id) => ids.add(id));
  });
  return ids;
}

function withdrawalBelongsToSeller(withdrawal: CashWithdrawalRow, sellerSaleIds: Set<string>) {
  const ids = Array.isArray(withdrawal.sale_ids) ? withdrawal.sale_ids.map((id) => String(id || "").trim()).filter(Boolean) : [];
  return ids.length > 0 && ids.every((id) => sellerSaleIds.has(id));
}

async function sellerSaleIdSet(profile: UserProfile) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sales")
    .select("id")
    .eq("seller_name", profile.sellerDisplayName);

  if (error) throw error;
  return new Set((data ?? []).map((row: SaleOwnerRow) => String(row.id || "").trim()).filter(Boolean));
}

async function validateSaleIdsForProfile(profile: UserProfile, saleIds: string[]) {
  if (!saleIds.length) return { saleIds: [], error: null as string | null, status: 200 };

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sales")
    .select("id,seller_name")
    .in("id", saleIds);

  if (error) return { saleIds: [], error: error.message, status: 500 };

  const rows = (data ?? []) as SaleOwnerRow[];
  const foundById = new Map(rows.map((row) => [String(row.id || ""), String(row.seller_name || "")]));
  const missingIds = saleIds.filter((id) => !foundById.has(id));

  if (missingIds.length) {
    return { saleIds: [], error: "Uma ou mais vendas vinculadas ao saque nao foram encontradas.", status: 400 };
  }

  if (isSeller(profile)) {
    const foreignIds = saleIds.filter((id) => foundById.get(id) !== profile.sellerDisplayName);
    if (foreignIds.length) {
      return { saleIds: [], error: "Voce so pode sacar vendas do seu proprio caixa.", status: 403 };
    }
  }

  return { saleIds, error: null, status: 200 };
}

async function findAlreadyWithdrawnSaleIds(saleIds: string[]) {
  if (!saleIds.length) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("cash_withdrawals")
    .select("sale_ids");

  if (error) throw error;
  const usedSaleIds = saleIdsFromWithdrawals((data ?? []) as CashWithdrawalRow[]);
  return saleIds.filter((id) => usedSaleIds.has(id));
}

async function canEditWithdrawal(profile: UserProfile, withdrawal: CashWithdrawalRow) {
  if (isAdmin(profile)) return true;
  if (!isSeller(profile)) return false;
  const sellerIds = await sellerSaleIdSet(profile);
  return withdrawalBelongsToSeller(withdrawal, sellerIds);
}

export async function GET() {
  const auth = await requireAuth();
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

  let withdrawals = ((data ?? []) as CashWithdrawalRow[]);
  if (isSeller(auth.profile)) {
    const sellerIds = await sellerSaleIdSet(auth.profile);
    withdrawals = withdrawals.filter((withdrawal) => withdrawalBelongsToSeller(withdrawal, sellerIds));
  }

  return NextResponse.json({ configured: true, withdrawals: withdrawals.map(mapWithdrawal) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  if (!isAdmin(auth.profile) && !isSeller(auth.profile)) return forbiddenResponse();

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

  if (isSeller(auth.profile) && !saleIds.length) {
    return NextResponse.json({ error: "Selecione vendas do seu caixa para vincular ao saque." }, { status: 400 });
  }

  const validation = await validateSaleIdsForProfile(auth.profile, saleIds);
  if (validation.error) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const duplicatedSaleIds = await findAlreadyWithdrawnSaleIds(validation.saleIds);
  if (duplicatedSaleIds.length) {
    return NextResponse.json({ error: "Uma ou mais vendas selecionadas ja estao vinculadas a outro saque." }, { status: 409 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("cash_withdrawals")
    .insert({
      amount,
      withdrawn_at: withdrawnAt,
      note: cleanText(body.note) || "Saque do caixa",
      sale_ids: validation.saleIds
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ withdrawal: mapWithdrawal(data) }, { status: 201, headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  if (!isAdmin(auth.profile) && !isSeller(auth.profile)) return forbiddenResponse();

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
  const current = await supabase
    .from("cash_withdrawals")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (current.error) {
    return NextResponse.json({ error: current.error.message }, { status: 500 });
  }

  if (!current.data) {
    return NextResponse.json({ error: "Saque nao encontrado." }, { status: 404 });
  }

  if (!(await canEditWithdrawal(auth.profile, current.data as CashWithdrawalRow))) {
    return forbiddenResponse("Voce nao pode editar este saque.");
  }

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
