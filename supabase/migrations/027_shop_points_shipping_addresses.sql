-- 購物點數、點數流水、多筆收件地址、商城個人化開關
-- @see docs/changes（實作後 changelog）

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS shop_points_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shop_personalize_recommendations BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN user_profiles.shop_points_balance IS '購物點餘額，1點=1元新台幣';
COMMENT ON COLUMN user_profiles.shop_personalize_recommendations IS 'TRUE=商城排序使用個人化分數；FALSE=依評分等一般排序';

CREATE TABLE user_shop_point_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta           INTEGER NOT NULL,
  balance_after   INTEGER NOT NULL,
  reason          TEXT NOT NULL
                  CHECK (reason IN (
                    'subscription_grant',
                    'order_redeem',
                    'admin_adjust',
                    'other'
                  )),
  ref_type        TEXT,
  ref_id          UUID,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_shop_point_ledger_user_created_idx
  ON user_shop_point_ledger (user_id, created_at DESC);

COMMENT ON TABLE user_shop_point_ledger IS '購物點異動流水；寫入以 service role／後端為主';

ALTER TABLE user_shop_point_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own shop point ledger"
ON user_shop_point_ledger FOR SELECT
USING (auth.uid() = user_id);

CREATE TABLE user_shipping_addresses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name   TEXT NOT NULL,
  phone            TEXT NOT NULL,
  address_full     TEXT NOT NULL,
  is_default       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order       SMALLINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_shipping_addresses_address_len
    CHECK (char_length(address_full) BETWEEN 1 AND 500),
  CONSTRAINT user_shipping_addresses_name_len
    CHECK (char_length(recipient_name) BETWEEN 1 AND 120),
  CONSTRAINT user_shipping_addresses_phone_len
    CHECK (char_length(phone) BETWEEN 1 AND 40)
);

CREATE UNIQUE INDEX user_shipping_addresses_one_default_per_user
  ON user_shipping_addresses (user_id)
  WHERE is_default = TRUE;

CREATE INDEX user_shipping_addresses_user_id_idx
  ON user_shipping_addresses (user_id);

COMMENT ON TABLE user_shipping_addresses IS '使用者多筆收件地址，每使用者僅一筆 is_default=TRUE';

ALTER TABLE user_shipping_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own shipping addresses"
ON user_shipping_addresses FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

INSERT INTO user_shipping_addresses (
  user_id,
  recipient_name,
  phone,
  address_full,
  is_default,
  sort_order
)
SELECT
  p.user_id,
  trim(p.shipping_recipient_name),
  trim(p.shipping_phone),
  trim(p.shipping_address_full),
  TRUE,
  0
FROM user_profiles p
WHERE trim(COALESCE(p.shipping_recipient_name, '')) <> ''
  AND trim(COALESCE(p.shipping_phone, '')) <> ''
  AND trim(COALESCE(p.shipping_address_full, '')) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM user_shipping_addresses a WHERE a.user_id = p.user_id
  );
