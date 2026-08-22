import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";
import {
  cleanText,
  isProductSetupError,
  mapProductKit,
  positiveInteger,
  productKitSelect,
  productSetupResponse,
  type ProductKitRow,
  validUuid
} from "../../_shared";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  const { id: rawId } = await context.params;
  const productId = validUuid(rawId);
  if (!productId) return NextResponse.json({ error: "Produto inválido." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const name = cleanText(body.name);
  const quantity = positiveInteger(body.quantity);
  if (!name || name.length > 120) return NextResponse.json({ error: "Informe um nome de kit válido." }, { status: 400 });
  if (quantity === null) return NextResponse.json({ error: "Informe uma quantidade inteira maior que zero." }, { status: 400 });
  if (body.isActive !== undefined && typeof body.isActive !== "boolean") return NextResponse.json({ error: "Informe um status válido para o kit." }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const result = await admin.from("product_kits").insert({
    product_id: productId,
    name,
    quantity,
    is_active: body.isActive !== false,
    created_by: auth.user.id
  }).select(productKitSelect).single();
  if (result.error) {
    if (isProductSetupError(result.error)) return productSetupResponse();
    if (result.error.code === "23505") return NextResponse.json({ error: "Já existe um kit com esse nome para o produto." }, { status: 409 });
    if (result.error.code === "23503") return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  return NextResponse.json({ kit: mapProductKit(result.data as ProductKitRow) }, { status: 201 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  const { id: rawId } = await context.params;
  const productId = validUuid(rawId);
  if (!productId) return NextResponse.json({ error: "Produto inválido." }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const kitId = validUuid(body.id);
  if (!kitId) return NextResponse.json({ error: "Kit inválido." }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const value = cleanText(body.name);
    if (!value || value.length > 120) return NextResponse.json({ error: "Informe um nome de kit válido." }, { status: 400 });
    updates.name = value;
  }
  if (body.quantity !== undefined) {
    const value = positiveInteger(body.quantity);
    if (value === null) return NextResponse.json({ error: "Informe uma quantidade inteira maior que zero." }, { status: 400 });
    updates.quantity = value;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return NextResponse.json({ error: "Informe um status válido para o kit." }, { status: 400 });
    updates.is_active = body.isActive;
  }
  if (!Object.keys(updates).length) return NextResponse.json({ error: "Nenhuma alteração válida foi informada." }, { status: 400 });

  const result = await getSupabaseAdminClient().from("product_kits").update(updates)
    .eq("id", kitId).eq("product_id", productId).select(productKitSelect).maybeSingle();
  if (result.error) {
    if (isProductSetupError(result.error)) return productSetupResponse();
    if (result.error.code === "23505") return NextResponse.json({ error: "Já existe um kit com esse nome para o produto." }, { status: 409 });
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  if (!result.data) return NextResponse.json({ error: "Kit não encontrado para este produto." }, { status: 404 });
  return NextResponse.json({ kit: mapProductKit(result.data as ProductKitRow) });
}
