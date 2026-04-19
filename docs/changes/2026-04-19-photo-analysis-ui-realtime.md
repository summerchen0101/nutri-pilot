# 拍照辨識：DB 已 ready 但畫面仍 pending

**日期**：2026-04-19  
**影響規格**：docs/06-pages.md（飲食紀錄／log）、docs/07-api.md  
**類型**：修改 | 技術替換

## 原規格

`/log` 拍照後以 Queue 辨識，結果寫入 `photo_analysis_jobs`，前端以 Realtime 更新 UI。

## 實際做法

1. **`photo_analysis_jobs` 未加入 `supabase_realtime` publication**：`postgres_changes` 收不到 UPDATE，UI 卡在「pending」。新增 migration **`003_photo_analysis_jobs_realtime.sql`** 將表納入 publication。
2. **輪詢後備**：即使仍漏設 replication，仍以約 1.5s 間隔查詢同一 job 直至 `ready`/`error` 或逾時。

## 原因

預設 Realtime 僅對已發佈的表推送；缺少 publication 時僅 PostgreSQL 狀態會變，前端無事件。

## 後續

線上環境請執行 migration（或 Dashboard → Database → Replication 勾選該表）。
