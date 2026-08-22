import { NextResponse } from "next/server";
import { isAdmin, requireAdmin, requireAuth } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";
import {
  cleanText,
  isProductSetupError,
  loadProductDetail,
  mapProduct,
  positiveMoney,
  productCostSelect,
  productKitSelect,
  productSelect,
  productSetupResponse,
  type ProductCostRow,
  type ProductKitRow,
  type ProductRow,
  validDate,
  validUuid
} from "./_shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });

  const admin = getSupabaseAdminClient();
  const canViewCosts = isAdmin(auth.profile);
  const searchParams = new URL(request.url).searchParams;
  const optionsOnly = searchParams.get("mode") === "options";
  const rawCostReferenceDate = searchParams.get("asOf");
  const costReferenceDate = rawCostReferenceDate ? validDate(rawCostReferenceDate) : null;
  if (rawCostReferenceDate && !costReferenceDate) return NextResponse.json({ error: "Data de referência do custo inválida." }, { status: 400 });
  const rawIncludedProduct = optionsOnly ? searchParams.get("include") : null;
  const includedProductId = rawIncludedProduct ? validUuid(rawIncludedProduct) : null;
  if (rawIncludedProduct && !includedProductId) return NextResponse.json({ error: "Produto histórico inválido." }, { status: 400 });
  const activeOnly = optionsOnly || !canViewCosts;
  let productsQuery = admin.from("products").select(productSelect).order("name");
  if (activeOnly) {
    productsQuery = includedProductId
      ? productsQuery.or(`and(status.eq.active,available_for_new_sales.eq.true),id.eq.${includedProductId}`)
      : productsQuery.eq("status", "active").eq("available_for_new_sales", true);
  }
  const productsResult = await productsQuery;
  if (productsResult.error) {
    if (isProductSetupError(productsResult.error)) return productSetupResponse();
    return NextResponse.json({ error: productsResult.error.message }, { status: 500 });
  }

  const rows = (productsResult.data || []) as ProductRow[];
  if (!rows.length) {
    return NextResponse.json(
      { products: [], setupRequired: false, canViewCosts },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const productIds = rows.map((row) => row.id);
  let kitsQuery = admin.from("product_kits").select(productKitSelect).in("product_id", productIds).order("quantity").order("name");
  if (activeOnly) {
    kitsQuery = includedProductId
      ? kitsQuery.or(`is_active.eq.true,product_id.eq.${includedProductId}`)
      : kitsQuery.eq("is_active", true);
  }
  const [kitsResult, costsResult] = await Promise.all([
    kitsQuery,
    canViewCosts
      ? admin.from("product_cost_history").select(productCostSelect).in("product_id", productIds).order("effective_from", { ascending: false }).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as ProductCostRow[], error: null })
  ]);
  const error = kitsResult.error || costsResult.error;
  if (error) {
    if (isProductSetupError(error)) return productSetupResponse();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const costs = (costsResult.data || []) as ProductCostRow[];
  const kits = (kitsResult.data || []) as ProductKitRow[];
  return NextResponse.json(
    {
      products: rows.map((row) => mapProduct(row, costs, kits, canViewCosts, costReferenceDate || undefined)),
      setupRequired: false,
      canViewCosts
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const name = cleanText(body.name);
  const sku = cleanText(body.sku);
  const shortDescription = cleanText(body.shortDescription);
  const unitName = cleanText(body.unitName);
  const imageUrl = cleanText(body.imageUrl);
  const initialUnitCost = positiveMoney(body.initialUnitCost);
  const costEffectiveFrom = validDate(body.costEffectiveFrom);

  if (!name || name.length > 160) return NextResponse.json({ error: "Informe um nome de produto válido." }, { status: 400 });
  if (sku && sku.length > 80) return NextResponse.json({ error: "O SKU deve possuir no máximo 80 caracteres." }, { status: 400 });
  if (shortDescription && shortDescription.length > 500) return NextResponse.json({ error: "A descrição deve possuir no máximo 500 caracteres." }, { status: 400 });
  if (!unitName || unitName.length > 80) return NextResponse.json({ error: "Informe uma unidade de medida válida." }, { status: 400 });
  if (imageUrl && imageUrl.length > 2048) return NextResponse.json({ error: "A URL da imagem é muito longa." }, { status: 400 });
  if (body.isActive !== undefined && typeof body.isActive !== "boolean") return NextResponse.json({ error: "Informe um status válido para o produto." }, { status: 400 });
  if (initialUnitCost === null) return NextResponse.json({ error: "Informe um custo unitário inicial maior que zero." }, { status: 400 });
  if (!costEffectiveFrom) return NextResponse.json({ error: "Informe uma data de vigência válida para o custo." }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const result = await admin.rpc("create_product_with_initial_cost", {
    p_name: name,
    p_sku: sku,
    p_short_description: shortDescription,
    p_unit_name: unitName,
    p_image_url: imageUrl,
    p_initial_unit_cost: initialUnitCost,
    p_effective_from: costEffectiveFrom,
    p_is_active: body.isActive !== false,
    p_admin_id: auth.user.id
  });
  if (result.error) {
    if (isProductSetupError(result.error)) return productSetupResponse();
    if (result.error.code === "23505") return NextResponse.json({ error: "Já existe um produto com esse SKU." }, { status: 409 });
    return NextResponse.json({ error: result.error.message || "Não foi possível cadastrar o produto." }, { status: 500 });
  }

  const rpcValue = result.data as Record<string, unknown> | null;
  const productId = typeof rpcValue?.product_id === "string" ? rpcValue.product_id : null;
  if (!productId) return NextResponse.json({ error: "O produto foi criado, mas não foi possível confirmar seu identificador." }, { status: 500 });
  const detail = await loadProductDetail(admin, productId);
  if ("error" in detail) {
    if (isProductSetupError(detail.error)) return productSetupResponse();
    return NextResponse.json({ error: detail.error.message }, { status: 500 });
  }
  if (!detail.product) return NextResponse.json({ error: "Produto criado não encontrado." }, { status: 500 });
  return NextResponse.json({ product: detail.product, setupRequired: false, canViewCosts: true }, { status: 201 });
}
