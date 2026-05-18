-- 購物點餘額不得為負；先修正既有異常列再套用 CHECK。
-- @see docs/05-shop.md、docs/changes/

UPDATE user_profiles
SET shop_points_balance = 0
WHERE shop_points_balance < 0;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_shop_points_balance_non_negative_chk
  CHECK (shop_points_balance >= 0);

COMMENT ON CONSTRAINT user_profiles_shop_points_balance_non_negative_chk ON user_profiles IS '購物點餘額≥0';
