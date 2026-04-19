-- food_log_items：標記使用者是否仍採信公式換算結果（手動調整巨量營養素時為 false）
ALTER TABLE food_log_items
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN food_log_items.is_verified IS '若使用者曾手動編輯巨量營養素數值則為 false';
