# 守衛：已儲存標籤紀錄可修改名稱

**日期**：2026-04-22  
**影響規格**：docs/06-pages.md  
**類型**：修改

## 原規格

`/guard/records` 列表僅顯示名稱並支援刪除；詳情頁僅顯示名稱，無更名流程。

## 實際做法

1. **前端**：新增 `GuardSavedRecordRenameButton`（`BottomSheetShell` + `Input`，驗證與守衛儲存紀錄一致，1–30 字）；以 Supabase client `update` `label_guard_saved_reports.name` 後 `router.refresh()`。
2. **列表**：每列右側與刪除並列編輯圖示。
3. **詳情**：標題列提供「編輯名稱」連結式按鈕。
4. **常數**：`MAX_LABEL_GUARD_SAVED_NAME_LENGTH` 置於 `lib/food/label-guard-saved.ts`，與 DB CHECK 一致；守衛頁儲存表單改為共用該常數。

## 原因

讓使用者校正或重命名已儲存紀錄，無需刪除重建。

## 後續

無。
