import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const businessErrors = ["Garantia inativa", "Venda financeiramente inválida", "Garantia liberada: o cliente já possui pagamento confirmado.", "Garantia já paga", "Garantia não encontrada", "Pagamento inválido"];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const { data, error } = await getSupabaseAdminClient().rpc("register_guarantee_payment", { p_guarantee_id: id, p_paid_amount: Number(body.paidAmount), p_paid_at: body.paidAt, p_notes: body.notes || null, p_admin_id: auth.user.id });
  if (error) {
    const knownMessage = businessErrors.find((message) => error.message.includes(message));
    return NextResponse.json({ error: knownMessage || "Não foi possível registrar o pagamento.", setupRequired: /register_guarantee_payment|schema cache/i.test(error.message) }, { status: 409 });
  }
  return NextResponse.json({ result: data });
}
