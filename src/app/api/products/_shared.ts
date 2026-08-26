import { NextResponse } from "next/server";
import type { Product, ProductCost, ProductKit } from "@/data/product-types";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type ProductRow = {
  id: string;
  name: string;
  sku?: string | null;
  short_description?: string | null;
  unit_name: string;
  image_url?: string | null;
  status: string | null;
  available_for_new_sales: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProductCostRow = {
  id: string;
  product_id: string;
  unit_cost: number | string;
  effective_from: string;
  created_at?: string | null;
};

export type ProductKitRow = {
  id: string;
  product_id: string;
  name: string;
  quantity: number | string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type ErrorLike = { code?: string; message?: string } | null | undefined;
type ProductQueryError = { code: string; message: string; details: string; hint: string };
type ProductAdminClient = ReturnType<typeof getSupabaseAdminClient>;

export const productSelect = "id,name,sku,short_description,unit_name,image_url,status,available_for_new_sales,created_at,updated_at";
export const productCostSelect = "id,product_id,unit_cost,effective_from,created_at";
export const productKitSelect = "id,product_id,name,quantity,is_active,created_at,updated_at";

export function cleanText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || null;
}

export function validUuid(value: unknown) {
  const normalized = cleanText(value);
  return normalized && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
    ? normalized
    : null;
}

export function validDate(value: unknown) {
  const normalized = cleanText(value);
  if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized ? null : normalized;
}

export function positiveMoney(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().replace(",", ".") : value;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999_999_999.99) return null;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function positiveInteger(value: unknown) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity > 0 && quantity <= 1_000_000 ? quantity : null;
}

export function isProductSetupError(error: ErrorLike) {
  if (!error) return false;
  const code = String(error.code || "");
  if (["42P01", "PGRST202", "PGRST204"].includes(code)) return true;
  const message = String(error.message || "");
  return ["42703", "42883"].includes(code)
    && /(?:products|product_cost_history|product_kits|manual_sale_cost_obligations|create_product_with_initial_cost|add_product_cost)/i.test(message)
    && /(?:schema cache|does not exist|could not find|not find|column|function)/i.test(message);
}

export function productSetupResponse() {
  return NextResponse.json(
    { error: "A migration 034 precisa ser aplicada para ativar Produtos.", setupRequired: true },
    { status: 409 }
  );
}

export function mapProductCost(row: ProductCostRow): ProductCost {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    unitCost: Number(row.unit_cost),
    effectiveFrom: String(row.effective_from),
    createdAt: row.created_at || undefined
  };
}

export function mapProductKit(row: ProductKitRow): ProductKit {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    name: String(row.name),
    quantity: Number(row.quantity),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined
  };
}

function todayInBrasilia() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function mapProduct(
  row: ProductRow,
  costRows: ProductCostRow[],
  kitRows: ProductKitRow[],
  includeCosts: boolean,
  costReferenceDate = todayInBrasilia()
): Product {
  const costs = costRows
    .filter((cost) => String(cost.product_id) === String(row.id))
    .map(mapProductCost)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const current = costs.find((cost) => cost.effectiveFrom <= costReferenceDate);
  const product: Product = {
    id: String(row.id),
    name: String(row.name),
    sku: row.sku || undefined,
    shortDescription: row.short_description || undefined,
    unitName: String(row.unit_name),
    imageUrl: row.image_url || undefined,
    isActive: row.status === "active" && row.available_for_new_sales === true,
    kits: kitRows
      .filter((kit) => String(kit.product_id) === String(row.id))
      .map(mapProductKit)
      .sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name, "pt-BR")),
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined
  };
  if (includeCosts) {
    product.costs = costs;
    product.currentCost = current?.unitCost;
    product.currentCostEffectiveFrom = current?.effectiveFrom;
  }
  return product;
}

export async function loadProductDetail(
  admin: ProductAdminClient,
  productId: string,
  companyId: string
): Promise<{ error: ProductQueryError } | { product: Product | null }> {
  const [productResult, costsResult, kitsResult] = await Promise.all([
    admin.from("products").select(productSelect).eq("company_id", companyId).eq("id", productId).maybeSingle(),
    admin.from("product_cost_history").select(productCostSelect).eq("company_id", companyId).eq("product_id", productId).order("effective_from", { ascending: false }).order("created_at", { ascending: false }),
    admin.from("product_kits").select(productKitSelect).eq("company_id", companyId).eq("product_id", productId).order("quantity").order("name")
  ]);
  const error = productResult.error || costsResult.error || kitsResult.error;
  if (error) return { error } as const;
  if (!productResult.data) return { product: null } as const;
  return {
    product: mapProduct(
      productResult.data as ProductRow,
      (costsResult.data || []) as ProductCostRow[],
      (kitsResult.data || []) as ProductKitRow[],
      true
    )
  } as const;
}
