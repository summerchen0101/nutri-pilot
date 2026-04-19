# food_cache：多來源欄位與全文搜尋索引

**日期**：2026-04-19  
**影響規格**：docs/02-schema.md  
**類型**：新增 | 修改

## 原規格

- `docs/02-schema.md` 未列出 `food_cache`（實際於 `supabase/migrations/002_log_food_cache_photo_jobs.sql` 建立）。
- `off_code` 為 `TEXT UNIQUE`（PostgreSQL 預設為 **NULLS DISTINCT**：多筆 `NULL` 互不衝突）。

## 實際做法

1. **Migration**：新增 `supabase/migrations/004_food_cache_multi_source.sql`（見檔頭說明：不可使用檔名 `002_food_cache_multi_source.sql`，字母順序會排在 `002_log_food_cache_photo_jobs.sql` 之前，`food_cache` 尚未建立即會失敗）。
2. **欄位**：`source`、`external_id`、`alias`、`fiber_g_per_100g`、`sodium_mg_per_100g`、`is_verified`；`source` 附 CHECK。
3. **off_code 唯一性**：卸載原 `food_cache_off_code_key`，改為 **`UNIQUE NULLS DISTINCT (off_code)`**（維持「多筆 `NULL`」且「非 NULL 之 `off_code` 不重複」—與舊版 inline `UNIQUE` 行為一致）。
   - 任務稿若寫「**NULLS NOT DISTINCT**」：在 PostgreSQL 15+ 語意為「NULL 視為相同」，僅允許**一筆** `off_code IS NULL`，與「允許多筆 NULL」矛盾；此處改採 **`NULLS DISTINCT`**（並於 migration 註解標明）。
4. **索引**：`food_cache_name_search`（`gin(to_tsvector('simple', name))`）。
5. **資料回填**：`off_code IS NOT NULL` → `source = 'off'`；其餘 → `source = 'user'`。
6. **規格書**：於 `docs/02-schema.md`「## 3. 飲食記錄」之 SQL 區塊補上 `food_cache` 定義。

## 原因

- 支援衛福部、USDA、AI 估算等多來源與搜尋別名；纖維與鈉以每 100g 與既有巨量營養欄位對齊。
- `is_verified` 區分官方／估算資料。
- Migration 檔名需符合 Supabase 依檔名字串排序的套用順序。

## 後續

- 於本機或 CI 執行 `supabase gen types typescript ...` 更新 `src/types/supabase.ts`（本次未一併提交）。
- 應用程式寫入時依來源設定 `source`、`is_verified`（衛福部/USDA `true`，AI `false`）。
