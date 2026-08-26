import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";
import {
  isProductSetupError,
  loadProductDetail,
  mapProductCost,
  positiveMoney,
  productCostSelect,
  productSetupResponse,
  type ProductCostRow,
  validDate,
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
  const unitCost = positiveMoney(body.unitCost);
  const effectiveFrom = validDate(body.effectiveFrom);
  if (unitCost === null) return NextResponse.json({ error: "Informe um custo unitário maior que zero." }, { status: 400 });
  if (!effectiveFrom) return NextResponse.json({ error: "Informe uma data de vigência válida." }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const result = await admin.rpc("add_product_cost", {
    p_product_id: productId,
    p_unit_cost: unitCost,
    p_effective_from: effectiveFrom,
    p_admin_id: auth.user.id
  });
  if (result.error) {
    if (isProductSetupError(result.error)) return productSetupResponse();
    if (result.error.code === "23505") return NextResponse.json({ error: "Já existe um custo com vigência nesta data." }, { status: 409 });
    const status = /Produto não encontrado/i.test(result.error.message) ? 404 : 500;
    return NextResponse.json({ error: result.error.message || "Não foi possível cadastrar o custo." }, { status });
  }

  const rpcValue = result.data as Record<string, unknown> | null;
  const costId = typeof rpcValue?.cost_id === "string" ? rpcValue.cost_id : null;
  if (!costId) return NextResponse.json({ error: "O custo foi criado, mas não foi possível confirmar seu identificador." }, { status: 500 });
  const costResult = await admin.from("product_cost_history").select(productCostSelect).eq("company_id", auth.companyId).eq("id", costId).maybeSingle();
  if (costResult.error) {
    if (isProductSetupError(costResult.error)) return productSetupResponse();
    return NextResponse.json({ error: costResult.error.message }, { status: 500 });
  }
  if (!costResult.data) return NextResponse.json({ error: "Custo criado não encontrado." }, { status: 500 });
  const detail = await loadProductDetail(admin, productId, auth.companyId);
  if ("error" in detail) {
    if (isProductSetupError(detail.error)) return productSetupResponse();
    return NextResponse.json({ error: detail.error.message }, { status: 500 });
  }
  return NextResponse.json(
    { cost: mapProductCost(costResult.data as ProductCostRow), product: detail.product },
    { status: 201 }
  );
}
