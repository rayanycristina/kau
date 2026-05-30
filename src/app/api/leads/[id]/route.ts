import { NextResponse } from "next/server";
import { forceSellerNameForProfile, isAdmin, requireAuth } from "@/lib/auth";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase-server";
import { mapLead } from "@/data/lead-mapping";
import type { LeadInput } from "@/data/leads-types";

export const dynamic = "force-dynamic";

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toMoney(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(number) || number < 0) return undefined;
  return Math.round(number * 100) / 100;
}

function patchFromBody(body: Partial<LeadInput>) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.customerName !== undefined) patch.customer_name = cleanText(body.customerName);
  if (body.customerPhone !== undefined) patch.customer_phone = cleanText(body.customerPhone);
  if (body.city !== undefined) patch.city = cleanText(body.city);
  if (body.address !== undefined) patch.address = cleanText(body.address);
  if (body.neighborhood !== undefined) patch.neighborhood = cleanText(body.neighborhood);
  if (body.productName !== undefined) patch.product_name = cleanText(body.productName) || "AlphaSin";
  if (body.temperature !== undefined) patch.temperature = body.temperature;
  if (body.contactStatus !== undefined) patch.contact_status = body.contactStatus;
  if (body.priority !== undefined) patch.priority = body.priority;
  if (body.sellerName !== undefined) patch.seller_name = body.sellerName;
  if (body.nextAction !== undefined) patch.next_action = cleanText(body.nextAction);
  if (body.nextActionAt !== undefined) patch.next_action_at = cleanText(body.nextActionAt);
  if (body.lastContactAt !== undefined) patch.last_contact_at = cleanText(body.lastContactAt);
  if (body.estimatedValue !== undefined) patch.estimated_value = toMoney(body.estimatedValue) ?? 0;
  if (body.source !== undefined) patch.source = cleanText(body.source);
  if (body.notes !== undefined) patch.notes = cleanText(body.notes);
  if (body.objections !== undefined) patch.objections = cleanText(body.objections);
  if (body.followUpHistory !== undefined) patch.follow_up_history = cleanText(body.followUpHistory);
  return patch;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Supabase nao configurado." }, { status: 503 });
  const { profile, response } = await requireAuth();
  if (response || !profile) return response;

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  let query = supabase.from("leads").select("*").eq("id", id);
  if (!isAdmin(profile)) query = query.eq("seller_name", profile.sellerDisplayName);
  const { data, error } = await query.single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: mapLead(data) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Supabase nao configurado." }, { status: 503 });
  const { profile, response } = await requireAuth();
  if (response || !profile) return response;

  const { id } = await params;
  const body = forceSellerNameForProfile(profile, (await request.json().catch(() => null) ?? {}) as Record<string, unknown>);
  const patch = patchFromBody(body);

  if (patch.customer_name === null) return NextResponse.json({ error: "Nome do lead nao pode ficar vazio." }, { status: 400 });
  if (patch.customer_phone === null) return NextResponse.json({ error: "Telefone do lead nao pode ficar vazio." }, { status: 400 });

  const supabase = getSupabaseServerClient();
  let updateQuery = supabase.from("leads").update(patch).eq("id", id);
  if (!isAdmin(profile)) updateQuery = updateQuery.eq("seller_name", profile.sellerDisplayName);
  const { data, error } = await updateQuery.select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: mapLead(data) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Supabase nao configurado." }, { status: 503 });
  const { profile, response } = await requireAuth();
  if (response || !profile) return response;

  const { id } = await params;
  const supabase = getSupabaseServerClient();

  // Importante: no Supabase com RLS, um delete sem policy pode retornar sem erro
  // mas também sem remover nenhuma linha. Por isso usamos select("id") para confirmar.
  let deleteQuery = supabase
    .from("leads")
    .delete()
    .eq("id", id);
  if (!isAdmin(profile)) deleteQuery = deleteQuery.eq("seller_name", profile.sellerDisplayName);
  const { data, error } = await deleteQuery.select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "O lead nao foi excluido no Supabase. Execute o SQL supabase/008_leads_delete_hardening.sql uma vez e tente novamente." },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, deletedId: id }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
