import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const bucket = "product-images-private";
const types: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(); if ("error" in auth) return auth.error; const { id } = await context.params; const admin = getSupabaseAdminClient();
  const product = await admin.from("products").select("image_url,image_storage_bucket,image_storage_path").eq("company_id", auth.companyId).eq("id", id).maybeSingle();
  if (!product.data) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  if (!product.data.image_storage_path) return product.data.image_url ? NextResponse.redirect(product.data.image_url) : NextResponse.json({ error: "Produto sem imagem." }, { status: 404 });
  const signed = await admin.storage.from(product.data.image_storage_bucket || bucket).createSignedUrl(product.data.image_storage_path, 300);
  if (signed.error) return NextResponse.json({ error: "Não foi possível carregar a imagem." }, { status: 404 });
  return NextResponse.redirect(signed.data.signedUrl);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error; const { id } = await context.params; const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecione uma imagem." }, { status: 400 });
  const extension = types[file.type]; if (!extension) return NextResponse.json({ error: "Use PNG, JPG, JPEG ou WEBP." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "A imagem deve ter no máximo 5 MB." }, { status: 400 });
  const admin = getSupabaseAdminClient(); const product = await admin.from("products").select("id,image_url,image_storage_bucket,image_storage_path").eq("company_id", auth.companyId).eq("id", id).maybeSingle(); if (!product.data) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  const path = `companies/${auth.companyId}/products/${id}/${randomUUID()}.${extension}`; const upload = await admin.storage.from(bucket).upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (upload.error) return NextResponse.json({ error: /bucket/i.test(upload.error.message) ? "A migration 037 precisa ser aplicada para ativar o upload." : upload.error.message }, { status: 409 });
  const imageUrl = `/api/products/${id}/image`; const updated = await admin.from("products").update({ image_url: imageUrl, image_storage_bucket: bucket, image_storage_path: path }).eq("company_id", auth.companyId).eq("id", id);
  if (updated.error) { await admin.storage.from(bucket).remove([path]); return NextResponse.json({ error: updated.error.message }, { status: 500 }); }
  if (product.data.image_storage_path) await admin.storage.from(product.data.image_storage_bucket || bucket).remove([product.data.image_storage_path]);
  return NextResponse.json({ imageUrl });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error; const { id } = await context.params; const admin = getSupabaseAdminClient(); const product = await admin.from("products").select("id,image_url,image_storage_bucket,image_storage_path").eq("company_id", auth.companyId).eq("id", id).maybeSingle(); if (!product.data) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  const updated = await admin.from("products").update({ image_url: null, image_storage_bucket: null, image_storage_path: null }).eq("company_id", auth.companyId).eq("id", id); if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 }); if (product.data.image_storage_path) await admin.storage.from(product.data.image_storage_bucket || bucket).remove([product.data.image_storage_path]); return NextResponse.json({ imageUrl: null });
}
