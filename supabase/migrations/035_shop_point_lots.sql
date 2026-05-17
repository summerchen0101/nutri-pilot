-- 購物點批次（效期／FIFO 剩餘量）與 ledger 效期欄位
-- @see docs/changes、docs/02-schema.md、docs/05-shop.md

ALTER TABLE user_shop_point_ledger
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

COMMENT ON COLUMN user_shop_point_ledger.expires_at IS '入帳列可選；與對應批次的 expires_at 一致；扣帳列通常為 NULL';

CREATE TABLE user_shop_point_lots (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_remaining   INTEGER NOT NULL CHECK (amount_remaining >= 0),
  expires_at         TIMESTAMPTZ NOT NULL,
  grant_ledger_id    UUID REFERENCES user_shop_point_ledger(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_shop_point_lots_user_expires_idx
  ON user_shop_point_lots (user_id, expires_at ASC)
  WHERE amount_remaining > 0;

CREATE INDEX user_shop_point_lots_user_id_idx
  ON user_shop_point_lots (user_id);

COMMENT ON TABLE user_shop_point_lots IS '購物點分批剩餘量；入帳／扣帳須與 ledger、shop_points_balance 同步維護';
COMMENT ON COLUMN user_shop_point_lots.amount_remaining IS '該批次尚未消耗／未過期核銷的點數';
COMMENT ON COLUMN user_shop_point_lots.grant_ledger_id IS '可選；對應入帳 ledger 列';

ALTER TABLE user_shop_point_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own shop point lots"
  ON user_shop_point_lots FOR SELECT
  USING (auth.uid() = user_id);

-- 既有餘額：單一批次、效期 1 年（過渡；見 docs/changes）
INSERT INTO user_shop_point_lots (user_id, amount_remaining, expires_at)
SELECT
  p.user_id,
  p.shop_points_balance,
  NOW() + INTERVAL '365 days'
FROM user_profiles p
WHERE p.shop_points_balance > 0
  AND NOT EXISTS (
    SELECT 1
    FROM user_shop_point_lots l
    WHERE l.user_id = p.user_id
  );

CREATE OR REPLACE FUNCTION public.get_shop_points_next_expiry()
RETURNS TABLE (expires_at timestamptz, points bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    l.expires_at,
    SUM(l.amount_remaining)::bigint AS points
  FROM user_shop_point_lots l
  WHERE l.user_id = auth.uid()
    AND l.amount_remaining > 0
    AND l.expires_at > NOW()
  GROUP BY l.expires_at
  ORDER BY l.expires_at ASC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_shop_points_next_expiry() IS '目前登入者「最早到期且尚未過期」批次的加總點數與到期時間';

REVOKE ALL ON FUNCTION public.get_shop_points_next_expiry() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shop_points_next_expiry() TO authenticated;
