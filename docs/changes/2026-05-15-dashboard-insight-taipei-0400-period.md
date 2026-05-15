# 今日建議快取改用 Asia/Taipei 每日 04:00 換線

**日期**：2026-05-15
**影響規格**：docs/04-ai-engine.md、docs/06-pages.md
**類型**：修改

## 原規格

首頁「今日 Dashboard 建議」以**伺服器本地曆日**作為 `dashboard_daily_insights` 的快取鍵（`insight_date`），每日每使用者快取一次；近 7 日脈絡視窗的行為文件未區分換線語意。

## 實際做法

- `insight_date` 改為 **Asia/Taipei** 下、以**每日 04:00** 為界的「建議週期」錨點：當地時間小於 04:00 時與**前一曆日**同一快取鍵；04:00 起使用**當日**Taipei 曆日的 `YYYY-MM-DD`。
- 近 7 日資料彙總仍以 Taipei **曆法「今日」**為結束日（與當時是否已過 04:00 無關），起算為結束日前推 6 天（沿用現有 ISO 字串 `addCalendarDaysISO`）。
- Schema 未變；仍寫入 `dashboard_daily_insights`。
- 實作輔助：`calendar-days-utc.ts`（純 UTC 曆日加減）、`dashboard-insight-period-taipei.ts`。

## 原因

對齊產品上「日凌晨前仍算前一日」的建議周期，並與既有帳務月 Taipei 語意一致；避免部署機器時區與使用者預期不一致。

## 後續

已同步更新規格段落；為永久決策，無額外遷移。
