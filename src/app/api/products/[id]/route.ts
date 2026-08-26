import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";
import {
  cleanText,
  isProductSetupError,
  loadProductDetail,
  productSelect,
  productSetupResponse,
  validUuid
} from "../_shared";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  const { id: rawId } = await context.params;
  const id = validUuid(rawId);
  if (!id) return NextResponse.json({ error: "Produto inválido." }, { status: 400 });

  const detail = await loadProductDetail(getSupabaseAdminClient(), id, auth.companyId);
  if ("error" in detail) {
    if (isProductSetupError(detail.error)) return productSetupResponse();
    return NextResponse.json({ error: detail.error.message }, { status: 500 });
  }
  if (!detail.product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  return NextResponse.json(
    { product: detail.product, setupRequired: false, canViewCosts: true },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });
  const { id: rawId } = await context.params;
  const id = validUuid(rawId);
  if (!id) return NextResponse.json({ error: "Produto inválido." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const value = cleanText(body.name);
    if (!value || value.length > 160) return NextResponse.json({ error: "Informe um nome de produto válido." }, { status: 400 });
    updates.name = value;
  }
  if (body.sku !== undefined) {
    const value = cleanText(body.sku);
    if (value && value.length > 80) return NextResponse.json({ error: "O SKU deve possuir no máximo 80 caracteres." }, { status: 400 });
    updates.sku = value;
  }
  if (body.shortDescription !== undefined) {
    const value = cleanText(body.shortDescription);
    if (value && value.length > 500) return NextResponse.json({ error: "A descrição deve possuir no máximo 500 caracteres." }, { status: 400 });
    updates.short_description = value;
  }
  if (body.unitName !== undefined) {
    const value = cleanText(body.unitName);
    if (!value || value.length > 80) return NextResponse.json({ error: "Informe uma unidade de medida válida." }, { status: 400 });
    updates.unit_name = value;
  }
  if (body.imageUrl !== undefined) {
    const value = cleanText(body.imageUrl);
    if (value && value.length > 2048) return NextResponse.json({ error: "A URL da imagem é muito longa." }, { status: 400 });
    updates.image_url = value;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return NextResponse.json({ error: "Informe um status válido para o produto." }, { status: 400 });
    updates.status = body.isActive ? "active" : "inactive";
    updates.available_for_new_sales = body.isActive;
  }
  if (!Object.keys(updates).length) return NextResponse.json({ error: "Nenhuma alteração válida foi informada." }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const result = await admin.from("products").update(updates).eq("company_id", auth.companyId).eq("id", id).select(productSelect).maybeSingle();
  if (result.error) {
    if (isProductSetupError(result.error)) return productSetupResponse();
    if (result.error.code === "23505") return NextResponse.json({ error: "Já existe um produto com esse SKU." }, { status: 409 });
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  if (!result.data) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const detail = await loadProductDetail(admin, id, auth.companyId);
  if ("error" in detail) {
    if (isProductSetupError(detail.error)) return productSetupResponse();
    return NextResponse.json({ error: detail.error.message }, { status: 500 });
  }
  return NextResponse.json({ product: detail.product, setupRequired: false, canViewCosts: true });
}
