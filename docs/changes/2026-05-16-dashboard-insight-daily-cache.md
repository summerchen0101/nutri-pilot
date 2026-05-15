# 首頁 AI 建議改為每日自動產生並快取

**日期**：2026-05-16  
**影響規格**：docs/04-ai-engine.md、docs/06-pages.md  
**類型**：修改

## 原規格

- 首頁「今日建議」由使用者點擊按鈕後才呼叫 `POST /api/ai/dashboard-insight`，每次請求即時產出。

## 實際做法

- 新增資料表 `dashboard_daily_insights`（`user_id` + `insight_date` 唯一），儲存當日 bullet 陣列（JSONB）。
- 共用邏輯集中於 `getOrCreateDashboardDailyInsight`：先讀快取；無則執行既有彙整與 Claude；成功後寫入快取；僅在實際呼叫模型時寫入 `ai_usage_events`。
- 首頁以 `Suspense` 包 `DashboardDailyInsightDeferred`（async server component），移除手動按鈕與 client 專用區塊。
- `POST /api/ai/dashboard-insight` 改呼叫同一函式（同日仍走快取）。

## 原因

降低操作摩擦、控管每日每使用者最多一次模型呼叫，並讓再度進入首頁時即時顯示已產出內容。

## 後續

部署前需套用 migration `031_dashboard_daily_insights.sql` 並 `supabase gen types`（本 repo 已更新 `src/types/supabase.ts`）。
