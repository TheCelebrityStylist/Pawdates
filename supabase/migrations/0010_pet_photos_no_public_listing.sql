begin;
-- Public bucket already serves objects at /storage/v1/object/public/... without
-- needing a SELECT RLS policy. This policy only added the ability to LIST/enumerate
-- every object (and thus every user_id folder) in the bucket via the storage API —
-- an unintended info leak the Supabase linter flagged. Drop it; public image URLs
-- keep working because the bucket's public flag (not this policy) serves them.
drop policy if exists pet_photos_public_read on storage.objects;
commit;
