import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const bucket = "product-images";
const types: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
function storagePath(url: string | null | undefined) { if (!url) return null; const marker = `/storage/v1/object/public/${bucket}/`; const index = url.indexOf(marker); return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null; }

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error; const { id } = await context.params; const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecione uma imagem." }, { status: 400 });
  const extension = types[file.type]; if (!extension) return NextResponse.json({ error: "Use PNG, JPG, JPEG ou WEBP." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "A imagem deve ter no máximo 5 MB." }, { status: 400 });
  const admin = getSupabaseAdminClient(); const product = await admin.from("products").select("id,image_url").eq("id", id).maybeSingle(); if (!product.data) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  const path = `products/${id}/${randomUUID()}.${extension}`; const upload = await admin.storage.from(bucket).upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (upload.error) return NextResponse.json({ error: /bucket/i.test(upload.error.message) ? "A migration 037 precisa ser aplicada para ativar o upload." : upload.error.message }, { status: 409 });
  const publicUrl = admin.storage.from(bucket).getPublicUrl(path).data.publicUrl; const updated = await admin.from("products").update({ image_url: publicUrl }).eq("id", id);
  if (updated.error) { await admin.storage.from(bucket).remove([path]); return NextResponse.json({ error: updated.error.message }, { status: 500 }); }
  const oldPath = storagePath(product.data.image_url); if (oldPath) await admin.storage.from(bucket).remove([oldPath]);
  return NextResponse.json({ imageUrl: publicUrl });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error; const { id } = await context.params; const admin = getSupabaseAdminClient(); const product = await admin.from("products").select("id,image_url").eq("id", id).maybeSingle(); if (!product.data) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  const updated = await admin.from("products").update({ image_url: null }).eq("id", id); if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 }); const path = storagePath(product.data.image_url); if (path) await admin.storage.from(bucket).remove([path]); return NextResponse.json({ imageUrl: null });
}
