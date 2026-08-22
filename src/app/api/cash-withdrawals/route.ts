import { NextResponse } from "next/server";
import { forbiddenResponse, isAdmin, isSeller, requireAuth } from "@/lib/auth";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase-server";
import type { UserProfile } from "@/data/user-profile-types";

export const dynamic = "force-dynamic";

type WithdrawalScope = "admin" | "seller";

function softDeleteSchemaMissing(error: { code?: string; message?: string } | null) {
  return ["42703", "PGRST204"].includes(String(error?.code || "")) || /deleted_at/i.test(String(error?.message || ""));
}

function toMoney(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/R\$|\s/g, "").replace(/\./g, "").replace(",", "."));

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
  scope?: WithdrawalScope | string | null;
  seller_name?: string | null;
};

type SaleOwnerRow = {
  id?: string | null;
  seller_name?: string | null;
};

function normalizeScope(value: unknown): WithdrawalScope {
  return value === "seller" ? "seller" : "admin";
}

function mapWithdrawal(row: CashWithdrawalRow) {
  return {
    id: row.id || "",
    amount: Number(row.amount || 0),
    withdrawnAt: row.withdrawn_at || todayKey(),
    note: row.note || undefined,
    saleIds: Array.isArray(row.sale_ids)
      ? row.sale_ids.map((id) => String(id || "").trim()).filter(Boolean)
      : [],
    createdAt: row.created_at || undefined,
    scope: normalizeScope(row.scope),
    sellerName: row.seller_name || undefined
  };
}

function saleIdsFromWithdrawal(row: CashWithdrawalRow) {
  if (!Array.isArray(row.sale_ids)) return [];
  return row.sale_ids.map((id) => String(id || "").trim()).filter(Boolean);
}

async function sellerSaleIdSet(profile: UserProfile) {
  const supabase = getSupabaseServerClient();

  const result = await supabase
    .from("sales")
    .select("id")
    .is("deleted_at", null)
    .eq("seller_name", profile.sellerDisplayName);

  if (result.error && softDeleteSchemaMissing(result.error)) {
    throw new Error("O campo deleted_at é necessário para vincular saques a vendas operacionais.");
  }

  const { data, error } = result;

  if (error) throw error;

  return new Set((data ?? []).map((row: SaleOwnerRow) => String(row.id || "").trim()).filter(Boolean));
}

async function validateSaleIdsForProfile(profile: UserProfile, saleIds: string[]) {
  if (!saleIds.length) return { saleIds: [], error: null as string | null, status: 200 };

  const supabase = getSupabaseServerClient();

  const result = await supabase
    .from("sales")
    .select("id,seller_name")
    .is("deleted_at", null)
    .in("id", saleIds);

  if (result.error && softDeleteSchemaMissing(result.error)) {
    return { saleIds: [], error: "O campo deleted_at é necessário para validar vendas operacionais.", status: 409 };
  }

  const { data, error } = result;

  if (error) return { saleIds: [], error: error.message, status: 500 };

  const rows = (data ?? []) as SaleOwnerRow[];
  const foundById = new Map(rows.map((row) => [String(row.id || ""), String(row.seller_name || "")]));
  const missingIds = saleIds.filter((id) => !foundById.has(id));

  if (missingIds.length) {
    return {
      saleIds: [],
      error: "Uma ou mais vendas vinculadas ao saque nao foram encontradas.",
      status: 400
    };
  }

  if (isSeller(profile)) {
    const foreignIds = saleIds.filter((id) => foundById.get(id) !== profile.sellerDisplayName);

    if (foreignIds.length) {
      return {
        saleIds: [],
        error: "Voce so pode sacar vendas do seu proprio caixa.",
        status: 403
      };
    }
  }

  return { saleIds, error: null, status: 200 };
}

async function findAlreadyWithdrawnSaleIds(
  saleIds: string[],
  scope: WithdrawalScope,
  sellerName?: string
) {
  if (!saleIds.length) return [];

  const supabase = getSupabaseServerClient();

  let query = supabase
    .from("cash_withdrawals")
    .select("sale_ids,scope,seller_name")
    .eq("scope", scope);

  if (scope === "seller") {
    query = query.eq("seller_name", sellerName || "");
  }

  const { data, error } = await query;

  if (error) throw error;

  const usedSaleIds = new Set<string>();

  ((data ?? []) as CashWithdrawalRow[]).forEach((withdrawal) => {
    saleIdsFromWithdrawal(withdrawal).forEach((id) => usedSaleIds.add(id));
  });

  return saleIds.filter((id) => usedSaleIds.has(id));
}

function withdrawalBelongsToCurrentWallet(profile: UserProfile, withdrawal: CashWithdrawalRow) {
  const scope = normalizeScope(withdrawal.scope);

  if (isAdmin(profile)) {
    return scope === "admin";
  }

  if (isSeller(profile)) {
    return scope === "seller" && withdrawal.seller_name === profile.sellerDisplayName;
  }

  return false;
}

async function canEditWithdrawal(profile: UserProfile, withdrawal: CashWithdrawalRow) {
  return withdrawalBelongsToCurrentWallet(profile, withdrawal);
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
      return NextResponse.json(
        { configured: true, setupRequired: true, withdrawals: [] },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
  }

  let withdrawals = (data ?? []) as CashWithdrawalRow[];

  withdrawals = withdrawals.filter((withdrawal) =>
    withdrawalBelongsToCurrentWallet(auth.profile, withdrawal)
  );

  return NextResponse.json(
    { configured: true, withdrawals: withdrawals.map(mapWithdrawal) },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!isAdmin(auth.profile) && !isSeller(auth.profile)) return forbiddenResponse();

  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: "Supabase ainda nao esta configurado no .env.local." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));

  const amount = toMoney(body.amount);
  const withdrawnAt = cleanText(body.withdrawnAt) || todayKey();
  const saleIds = cleanSaleIds(body.saleIds);

  const scope: WithdrawalScope = isAdmin(auth.profile) ? "admin" : "seller";
  const sellerName = scope === "seller" ? auth.profile.sellerDisplayName : null;

  if (!amount) {
    return NextResponse.json({ error: "Informe um valor de saque valido." }, { status: 400 });
  }

  if (isSeller(auth.profile) && !saleIds.length) {
    return NextResponse.json(
      { error: "Selecione vendas do seu caixa para vincular ao saque." },
      { status: 400 }
    );
  }

  const validation = await validateSaleIdsForProfile(auth.profile, saleIds);

  if (validation.error) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const duplicatedSaleIds = await findAlreadyWithdrawnSaleIds(
    validation.saleIds,
    scope,
    sellerName || undefined
  );

  if (duplicatedSaleIds.length) {
    return NextResponse.json(
      { error: "Uma ou mais vendas selecionadas ja estao vinculadas a outro saque desta carteira." },
      { status: 409 }
    );
  }

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("cash_withdrawals")
    .insert({
      amount,
      withdrawn_at: withdrawnAt,
      note: cleanText(body.note) || "Saque do caixa",
      sale_ids: validation.saleIds,
      scope,
      seller_name: sellerName
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { withdrawal: mapWithdrawal(data) },
    { status: 201, headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!isAdmin(auth.profile) && !isSeller(auth.profile)) return forbiddenResponse();

  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: "Supabase ainda nao esta configurado no .env.local." },
      { status: 503 }
    );
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

  return NextResponse.json(
    { withdrawal: mapWithdrawal(data) },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
