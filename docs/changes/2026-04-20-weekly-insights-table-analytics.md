# `weekly_insights` 資料表與 Analytics 頁

**日期**：2026-04-20  
**影響規格**：docs/08-admin.md、docs/06-pages.md、docs/03-features.md  
**類型**：新增

## 原規格

`weekly_insights` 表與 RLS 僅出現在後台／API 文件中的 SQL 片段；主專案 migration 原先未包含此表。

## 實際做法

- 新增 `supabase/migrations/007_weekly_insights.sql`（原誤用 `003_` 與既有 `003_photo_analysis_jobs_realtime.sql` 版本號衝突），與文件中的 `weekly_insights` 結構一致，並加上使用者僅能讀寫自己資料之 RLS。
- `/analytics` 以 Recharts 實作體重線圖、每日熱量長條圖、營養素達成率雷達圖；「達成率」為區間內三大營養素**總攝取**與「每日目標 × 天數」之比（上限顯示 150%），與單日平均比的另一種算法等價但較易實作。
- 週報區塊讀取最新一筆 `weekly_insights`；若尚未有 cron／Edge 寫入，顯示空狀態說明。

## 原因

對齊既有規格文件中的 schema，讓前端可查詢週報；Analytics 頁先前為 placeholder，需完成 Phase 3 P3-2。

## 後續

部署前於 Supabase 執行 migration；`ai-weekly-insight` Edge Function 與 pg_cron 可依 docs/07-api.md 另行接上。
