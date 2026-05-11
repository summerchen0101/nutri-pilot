-- 種子廠商顯示名稱與 brands 一致（不顯示「出貨中心」後綴）
UPDATE vendors
SET name = '堅果工坊'
WHERE slug = 'vendor-seed-nut-studio';

UPDATE vendors
SET name = '輕享蛋白'
WHERE slug = 'vendor-seed-lite-protein';

UPDATE vendors
SET name = '植粹生活館'
WHERE slug = 'vendor-seed-plant-pure';
