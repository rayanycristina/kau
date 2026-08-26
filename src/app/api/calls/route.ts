import { NextResponse } from "next/server";
import { isAdmin, isSeller, requireAuth } from "@/lib/auth";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ configured: false, calls: [] });
  }

  const supabase = getSupabaseServerClient();

  let query = supabase
    .from("call_records")
    .select("*")
    .eq("company_id", auth.companyId)
    .order("started_at", { ascending: false })
    .limit(200);

  if (isSeller(auth.profile)) {
    query = query.eq("seller_name", auth.profile.sellerDisplayName);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { configured: true, calls: data ?? [] },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase ainda nao esta configurado." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);

  const customerName = cleanText(body?.customerName);
  const customerPhone = cleanText(body?.customerPhone);
  const notes = cleanText(body?.notes);
  const callStatus = cleanText(body?.callStatus) || "attempted";

  if (!customerName) return NextResponse.json({ error: "Informe o nome do cliente." }, { status: 400 });
  if (!customerPhone) return NextResponse.json({ error: "Informe o telefone do cliente." }, { status: 400 });

  const sellerName = isAdmin(auth.profile)
    ? cleanText(body?.sellerName) || auth.profile.sellerDisplayName
    : auth.profile.sellerDisplayName;

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("call_records")
    .insert({
      company_id: auth.companyId,
      seller_id: auth.profile.id,
      seller_name: sellerName,
      customer_name: customerName,
      customer_phone: customerPhone,
      call_status: callStatus,
      call_direction: "outbound",
      notes
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ call: data }, { status: 201 });
}

