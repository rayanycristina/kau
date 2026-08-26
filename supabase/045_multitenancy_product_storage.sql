begin;

-- Novos uploads usam bucket privado e caminho contendo a empresa.
-- Dívida de migração: arquivos históricos do bucket público product-images
-- continuam públicos para quem conhece a URL, sem isolamento de leitura por tenant.
-- URLs/imagens antigas são preservadas por compatibilidade; esta migration não
-- move nem apaga arquivos. A migração do acervo antigo exige uma etapa posterior.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('product-images-private','product-images-private',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table public.products add column if not exists image_storage_bucket text;
alter table public.products add column if not exists image_storage_path text;

drop policy if exists product_images_private_member_read on storage.objects;
create policy product_images_private_member_read on storage.objects for select to authenticated
using (
  bucket_id='product-images-private'
  and (storage.foldername(name))[1]='companies'
  and public.is_company_member(((storage.foldername(name))[2])::uuid)
);

-- Nenhuma policy de escrita é criada para este bucket. Uploads passam pela API administrativa tenant-aware.

commit;
