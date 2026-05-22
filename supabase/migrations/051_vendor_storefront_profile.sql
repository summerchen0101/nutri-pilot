-- 廠商商城頁：banner、logo、簡介
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN vendors.description IS '廠商商城頁簡介';
COMMENT ON COLUMN vendors.banner_url IS '廠商商城頁 banner 圖 URL';
COMMENT ON COLUMN vendors.logo_url IS '廠商 logo（商城頁／列表）';

UPDATE vendors
SET description = '嚴選堅果與健康小食，以低加工、好原料為核心，適合日常補充與辦公室點心。'
WHERE slug = 'vendor-seed-nut-studio';

UPDATE vendors
SET description = '專注高蛋白與低負擔的蛋白棒、乳清與運動補給，協助你維持訓練與飲食目標。'
WHERE slug = 'vendor-seed-lite-protein';

UPDATE vendors
SET description = '以植物基與天然食材為主的健康選物，提供代餐、飲品與日常保健好物。'
WHERE slug = 'vendor-seed-plant-pure';
