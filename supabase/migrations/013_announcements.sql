-- Site announcements + per-user read state (app header bell, /announcements)

CREATE TABLE announcements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX announcements_visible_idx
  ON announcements (is_active, published_at DESC);

CREATE TABLE user_announcement_reads (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id  UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  read_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, announcement_id)
);

CREATE INDEX user_announcement_reads_user_idx
  ON user_announcement_reads (user_id);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read visible announcements"
ON announcements FOR SELECT
TO authenticated
USING (is_active = TRUE AND published_at <= NOW());

CREATE POLICY "Users manage own announcement reads"
ON user_announcement_reads FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
