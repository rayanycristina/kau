import { NextResponse } from "next/server";
import { applySellerScope, forceSellerNameForProfile, isAdmin, requireAuth } from "@/lib/auth";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase-server";
import type { LeadInput, LeadPriority, LeadTemperature, LeadContactStatus } from "@/data/leads-types";
import { mapLead } from "@/data/lead-mapping";
import { normalizeLeadSeller } from "@/data/lead-sellers";

export const dynamic = "force-dynamic";

const TEMPERATURES = ["hot", "warm", "cold"] as const;
const STATUSES = ["new", "answered", "not_answered", "called_no_answer", "scheduled", "call_soon", "return_tomorrow", "proposal_sent", "sold", "lost"] as const;
const PRIORITIES = ["critical", "high", "normal", "low"] as const;

function asOneOf<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]) {
  return allowed.includes(value as T[number]) ? (value as T[number]) : fallback;
}

function toMoney(value: unknown, fallback = 197) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.round(number * 100) / 100;
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeLead(body: Partial<LeadInput>) {
  const customerName = cleanText(body.customerName);
  const customerPhone = cleanText(body.customerPhone);

  if (!customerName) return { error: "Informe o nome do lead." } as const;
  if (!customerPhone) return { error: "Informe o telefone do lead." } as const;

  const temperature = asOneOf(body.temperature, TEMPERATURES, "hot") as LeadTemperature;
  const contactStatus = asOneOf(body.contactStatus, STATUSES, "new") as LeadContactStatus;
  const priority = asOneOf(body.priority, PRIORITIES, temperature === "hot" ? "high" : "normal") as LeadPriority;
  const sellerName = normalizeLeadSeller(body.sellerName);

  return {
    lead: {
      customer_name: customerName,
      customer_phone: customerPhone,
      city: cleanText(body.city),
      address: cleanText(body.address),
      neighborhood: cleanText(body.neighborhood),
      product_name: cleanText(body.productName) || "AlphaSin",
      temperature,
      contact_status: contactStatus,
      priority,
      seller_name: sellerName,
      next_action: cleanText(body.nextAction) || defaultNextAction(contactStatus),
      next_action_at: cleanText(body.nextActionAt),
      last_contact_at: cleanText(body.lastContactAt),
      estimated_value: toMoney(body.estimatedValue, 197),
      source: cleanText(body.source),
      notes: cleanText(body.notes),
      objections: cleanText(body.objections),
      follow_up_history: cleanText(body.followUpHistory)
    }
  } as const;
}

function defaultNextAction(status: LeadContactStatus) {
  if (status === "call_soon") return "Ligar daqui a pouco";
  if (status === "return_tomorrow") return "Retornar contato amanhã";
  if (status === "scheduled") return "Cumprir pré-agendamento";
  if (status === "not_answered" || status === "called_no_answer") return "Tentar nova ligação";
  return "Qualificar e conduzir para venda AlphaSin";
}

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ configured: false, leads: [] });
  }

  const { profile, response } = await requireAuth();
  if (response || !profile) return response;

  const supabase = getSupabaseServerClient();
  const query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const { data, error } = await applySellerScope(query, profile);

  if (error) {
    return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ configured: true, leads: (data ?? []).map(mapLead) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase ainda nao esta configurado no .env.local." }, { status: 503 });
  }

  const { profile, response } = await requireAuth();
  if (response || !profile) return response;

  const body = await request.json().catch(() => null);
  const scopedBody = forceSellerNameForProfile(profile, (body ?? {}) as Record<string, unknown>);
  const normalized = normalizeLead(scopedBody);

  if ("error" in normalized) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("leads")
    .insert(normalized.lead)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: mapLead(data) }, { status: 201 });
}


export async function PATCH(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase ainda nao esta configurado no .env.local." }, { status: 503 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Lead nao informado." }, { status: 400 });
  }

  const { profile, response } = await requireAuth();
  if (response || !profile) return response;

  const body = forceSellerNameForProfile(profile, (await request.json().catch(() => null) ?? {}) as Record<string, unknown>) as Partial<LeadInput>;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body?.contactStatus) {
    updates.contact_status = asOneOf(body.contactStatus, STATUSES, "new") as LeadContactStatus;
    updates.next_action = cleanText(body.nextAction) || defaultNextAction(updates.contact_status as LeadContactStatus);
  }
  if (body?.temperature) updates.temperature = asOneOf(body.temperature, TEMPERATURES, "hot") as LeadTemperature;
  if (body?.priority) updates.priority = asOneOf(body.priority, PRIORITIES, "normal") as LeadPriority;
  if (body?.nextActionAt !== undefined) updates.next_action_at = cleanText(body.nextActionAt);
  if (body?.lastContactAt !== undefined) updates.last_contact_at = cleanText(body.lastContactAt);
  if (body?.notes !== undefined) updates.notes = cleanText(body.notes);
  if (body?.objections !== undefined) updates.objections = cleanText(body.objections);

  const supabase = getSupabaseServerClient();
  let updateQuery = supabase
    .from("leads")
    .update(updates)
    .eq("id", id);
  if (!isAdmin(profile)) updateQuery = updateQuery.eq("seller_name", profile.sellerDisplayName);
  const { data, error } = await updateQuery.select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: mapLead(data) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
