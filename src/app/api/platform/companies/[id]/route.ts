import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = body.status === "active" || body.status === "suspended" ? body.status : null;
  if (!status) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  if (id === auth.companyId && status === "suspended") return NextResponse.json({ error: "A operação atual não pode ser suspensa durante seu próprio acesso." }, { status: 409 });
  const result = await getSupabaseAdminClient().from("companies").update({ status }).eq("id", id).select("id,status").maybeSingle();
  if (result.error || !result.data) return NextResponse.json({ error: result.error?.message || "Empresa não encontrada." }, { status: 404 });
  return NextResponse.json({ company: result.data });
}
