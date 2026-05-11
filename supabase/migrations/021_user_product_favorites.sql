-- Per-user product favorites (shop)

CREATE TABLE user_product_favorites (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX user_product_favorites_user_created_idx
  ON user_product_favorites (user_id, created_at DESC);

ALTER TABLE user_product_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own user_product_favorites"
ON user_product_favorites FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
