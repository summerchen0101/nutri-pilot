# Bottom Sheet 內選項列與主按鈕高度對齊

**日期**：2026-05-10  
**影響規格**：docs/09-ui-design.md（元件區塊以共用元件為準；無獨立「sheet 選項列」段落）  
**類型**：修改

## 原規格

設定等功能使用 Bottom Sheet 內的選項按鈕與底部「儲存」等多為 `py-2`，視覺高度低於全站 `Button`／`Input` 調整後的約 44px。

## 實際做法

- `OptionSelectSheet`、`EditAllergenSheet`：選項列改為 `flex min-h-11 items-center`（單列文案）。  
- 各 Sheet 底部主按鈕（及 `GoalInfoSheet` 的次要／關閉）改為 `flex min-h-11`、`py-[11px]`，與 `Button` default 一致。  
- `GoalInfoSheet` 唯讀値區塊改為 `min-h-11` 垂直對齊。  
- Guard／紀錄重新命名等 Bottom Sheet 底部儲存鈕同上。  
- 紀錄頁「常用項目」Bottom Sheet 列表項 `py-2.5` → `py-3`（多行內容不加死 `min-h`，避免裁切）。

## 原因

使用者要求彈窗內選擇器與主表單控制項同樣「加高」，觸控與視覺一致。

## 後續

若要在 `docs/09-ui-design.md` 增列「Bottom Sheet 選項列」專段，可再補一段與 `Button`／`Input` 對齊的說明。
