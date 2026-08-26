import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });

  const body = await request.json().catch(() => ({})) as { expenseId?: string; campaignId?: string };
  const expenseId = String(body.expenseId || "").trim();
  const campaignId = String(body.campaignId || "").trim();
  if (!uuidPattern.test(expenseId) || !uuidPattern.test(campaignId)) {
    return NextResponse.json({ error: "Selecione uma despesa e uma campanha válidas." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const [expenseResult, campaignResult] = await Promise.all([
    admin.from("expenses").select("id,category,campaign_id").eq("company_id", auth.companyId).eq("id", expenseId).maybeSingle(),
    admin.from("campaigns").select("id,status").eq("company_id", auth.companyId).eq("id", campaignId).maybeSingle()
  ]);
  if (expenseResult.error || campaignResult.error) {
    const message = expenseResult.error?.message || campaignResult.error?.message || "Não foi possível validar a atribuição.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  if (!expenseResult.data) return NextResponse.json({ error: "Despesa não encontrada." }, { status: 404 });
  if (expenseResult.data.category !== "traffic") return NextResponse.json({ error: "Somente despesas de Tráfego podem ser atribuídas." }, { status: 409 });
  if (expenseResult.data.campaign_id) return NextResponse.json({ error: "Esta despesa já possui uma campanha atribuída." }, { status: 409 });
  if (!campaignResult.data || campaignResult.data.status === "archived") return NextResponse.json({ error: "A campanha selecionada não está disponível." }, { status: 409 });

  const updated = await admin.from("expenses").update({ campaign_id: campaignId }).eq("company_id", auth.companyId).eq("id", expenseId).is("campaign_id", null).eq("category", "traffic").select("id,campaign_id").maybeSingle();
  if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });
  if (!updated.data) return NextResponse.json({ error: "A despesa foi alterada por outro usuário. Atualize a tela e tente novamente." }, { status: 409 });
  return NextResponse.json({ expenseId: String(updated.data.id), campaignId: String(updated.data.campaign_id) });
}
