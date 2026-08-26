import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error; const { id } = await context.params; const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const amount = Number(String(body.confirmedAmount ?? "").replace(",", ".")); const paidAt = typeof body.paidAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.paidAt) ? body.paidAt : null;
  if (!Number.isFinite(amount) || amount <= 0 || !paidAt) return NextResponse.json({ error: "Confirme o valor e a data real do pagamento." }, { status: 400 });
  const admin = getSupabaseAdminClient(); const item = await admin.from("sale_coproducer_obligations").select("id").eq("company_id", auth.companyId).eq("id", id).maybeSingle();
  if (!item.data) return NextResponse.json({ error: "Participação não encontrada." }, { status: 404 });
  const result = await admin.rpc("register_coproducer_participation_payment", { p_obligation_id: id, p_confirmed_amount: Math.round(amount * 100) / 100, p_paid_at: paidAt, p_admin_id: auth.user.id });
  if (result.error) return NextResponse.json({ error: result.error.message.includes("schema cache") ? "A migration 036 precisa ser aplicada." : result.error.message }, { status: 409 });
  return NextResponse.json({ result: result.data });
}
