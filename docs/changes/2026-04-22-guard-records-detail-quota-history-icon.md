# 標籤紀錄：History 圖示、配額、刪除與詳情頁

**日期**：2026-04-22  
**影響規格**：docs/06-pages.md  
**類型**：修改

## 原規格

- Dashboard 快速操作第五項為「標籤」圖示（Tag）連至 `/guard/records`。
- `/guard/records` 僅列表顯示名稱、時間、安全分數；無配額文案、無刪除、無詳情頁。

## 實際做法

1. 快速操作改為 `History` 圖示，文案改為「紀錄」，仍連至 `/guard/records`。
2. 常數 `MAX_LABEL_GUARD_SAVED_REPORTS`（5）集中於 `src/lib/food/label-guard-saved.ts`，與 DB 上限一致。
3. 列表頁顯示 **尚可紀錄數：n/5**（n 為已儲存筆數）；每筆可刪除（確認後 Supabase delete）、可點入 `/guard/records/[id]`。
4. 詳情頁：伺服端 join `label_guard_jobs` 取 `storage_path`，對 `label-guard-photos` 產生簽名 URL 顯示原圖；分析區塊抽成共用元件 `LabelGuardReportBody`，與守衛頁共用。

## 原因

使用者需辨識「紀錄」入口、掌握配額、管理已存項目，並回看當時相片與完整分析。

## 後續

若簽名 URL 過期需長時間停留補發，可改為 client 重新請求 signed URL。
