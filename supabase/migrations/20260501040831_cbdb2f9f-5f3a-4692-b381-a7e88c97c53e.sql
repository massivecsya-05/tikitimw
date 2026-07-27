-- Replace broad SELECT policy with one that allows fetching a specific object
-- but blocks bucket-level listing (storage.foldername returns null for empty paths).
DROP POLICY IF EXISTS "Public can view event banners" ON storage.objects;

CREATE POLICY "Public can view event banner files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'event-banners'
  AND name IS NOT NULL
  AND position('/' in name) > 0
);