INSERT INTO storage.buckets (id, name, public)
VALUES ('event-banners', 'event-banners', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='Public can view event banners') THEN
    CREATE POLICY "Public can view event banners" ON storage.objects FOR SELECT USING (bucket_id = 'event-banners');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='Users upload own event banners') THEN
    CREATE POLICY "Users upload own event banners" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'event-banners' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='Users update own event banners') THEN
    CREATE POLICY "Users update own event banners" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'event-banners' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='Users delete own event banners') THEN
    CREATE POLICY "Users delete own event banners" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'event-banners' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;