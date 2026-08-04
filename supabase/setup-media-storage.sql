-- ============================================================
-- Waptrix: template-media Storage Bucket Setup
-- Run this once in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Create the bucket (public = true so template media URLs work without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'template-media',
  'template-media',
  true,                         -- public: media URLs usable in WhatsApp templates
  52428800,                     -- 50 MB per file limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- 2. DROP existing policies if re-running this script
DROP POLICY IF EXISTS "Tenants can upload their own media"  ON storage.objects;
DROP POLICY IF EXISTS "Public can read template media"      ON storage.objects;
DROP POLICY IF EXISTS "Tenants can delete their own media"  ON storage.objects;
DROP POLICY IF EXISTS "Tenants can list their own media"    ON storage.objects;


-- 3. RLS: authenticated users can upload into their own folder only
--    Folder structure: template-media/{user_id}/{timestamp}-{filename}
CREATE POLICY "Tenants can upload their own media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'template-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- 4. RLS: anyone (including WhatsApp servers) can read public media
CREATE POLICY "Public can read template media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'template-media');


-- 5. RLS: authenticated users can delete their own files
CREATE POLICY "Tenants can delete their own media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'template-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- 6. RLS: authenticated users can list their own files
CREATE POLICY "Tenants can list their own media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'template-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- 7. Also add read_at column to message_logs if not already present
--    (needed for real per-day read tracking in analytics chart)
ALTER TABLE message_logs
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Done! The template-media bucket is ready.
-- ============================================================
