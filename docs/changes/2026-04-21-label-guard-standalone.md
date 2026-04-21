# 食品標示智慧分析（守衛）獨立管線與底部導覽

**日期**：2026-04-21  
**影響規格**：docs/02-schema.md、docs/04-ai-engine.md、docs/06-pages.md、docs/07-api.md  
**類型**：修改／技術替換

## 原規格

標示拍照與餐桌拍照共用 `food-photos`、`photo_analysis_jobs.job_kind=label`，並內嵌於 `/log?tab=label`。輸出為 `_kind: label_analysis`。

## 實際做法

1. **Migration `017_label_guard_jobs.sql`**：新增 `label_guard_jobs`、Storage bucket `label-guard-photos`（RLS 同模式）、Realtime publication。
2. **Edge**：`label-guard-request`、`label-guard-analyze`（QStash → Claude Vision）；prompt `_shared/label-guard-report-prompt.ts`，結果 `_kind: label_guard_report`（含 safety_score、alert_keywords、risk tier、族群建議、14 類過敏矩陣）。
3. **`ai-photo-request` / `ai-photo-analyze`**：僅處理餐桌 `meal`，不再接受 `jobKind=label`。
4. **前端**：`/guard`＋`GuardLabelClient`；`/log` 移除標籤分頁。
5. **底部導覽**：「守衛」連至 `/guard`（標籤圖示），取代原「分析」格；`/analytics` 仍可由總覽等連結進入。

## 原因

標示分析為獨立小工具，需與飲食紀錄管線、儲存與 JSON 契約分離；企劃要求報告型輸出與分級語意。

## 後續

於 Supabase 執行 migration、部署 `label-guard-request` 與 `label-guard-analyze`，並確認 QStash destination 指向新 Worker URL。
