-- 讓瀏覽器 supabase.channel().on('postgres_changes') 能收到 UPDATE
-- （否則 status 已 ready 但畫面仍卡在 pending）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'photo_analysis_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE photo_analysis_jobs;
  END IF;
END $$;
