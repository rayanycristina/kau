import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) { const auth = await requireAdmin(); if ("error" in auth) return auth.error; const { id } = await context.params; const { data, error } = await getSupabaseAdminClient().rpc("reverse_guarantee_payment", { p_guarantee_id: id, p_admin_id: auth.user.id }); if (error) return NextResponse.json({ error: "Não foi possível estornar o pagamento." }, { status: 409 }); return NextResponse.json({ result: data }); }
