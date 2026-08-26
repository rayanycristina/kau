import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const guarantee = await getSupabaseAdminClient().from("postpaid_guarantees").select("id").eq("company_id", auth.companyId).eq("id", id).maybeSingle();
  if (!guarantee.data) return NextResponse.json({ error: "Garantia não encontrada." }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const paidAt = String(body.paidAt || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) {
    return NextResponse.json({ error: "Informe uma data de pagamento válida." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdminClient().rpc("correct_guarantee_payment_date", {
    p_guarantee_id: id,
    p_new_paid_at: paidAt,
    p_admin_id: auth.user.id
  });

  if (error) {
    const message = /Garantia não encontrada|Garantia sem pagamento|Despesa vinculada não encontrada|Data de pagamento inválida|Acesso negado/i.test(error.message)
      ? error.message
      : "Não foi possível corrigir a data do pagamento.";
    return NextResponse.json({ error: message, setupRequired: /correct_guarantee_payment_date|schema cache/i.test(error.message) }, { status: 409 });
  }

  return NextResponse.json({ result: data, paidAt });
}
