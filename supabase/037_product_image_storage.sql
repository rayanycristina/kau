begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/png','image/jpeg','image/webp'];

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects for select
using (bucket_id = 'product-images');

-- Escritas são feitas exclusivamente pelas APIs administrativas com service_role.
-- Nenhuma policy de INSERT/UPDATE/DELETE é concedida a anon ou authenticated.

commit;
