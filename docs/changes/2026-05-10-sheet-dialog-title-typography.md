# Bottom Sheet／Portal 對話框標題字級

**日期**：2026-05-10  
**影響規格**：docs/09-ui-design.md、.cursor/rules/05-ui-design.mdc  
**類型**：修改

## 原規格

元件規範未單獨描述 bottom sheet／dialog 標題；實作為 `text-[15px] font-medium`（等同區塊標題視覺）。

## 實際做法

- `BottomSheetShell` 標題：改為 **`text-heading-page`**（20px／500）。  
- 儀表板「記錄今日體重」`role="dialog"` 標題：同上。

## 原因

提升彈窗標題可讀性與層級；沿用既有語意 token，避免新增 arbitrary 字級。

## 後續

已補 `docs/09-ui-design.md` 一小節與 `.cursor/rules/05-ui-design.mdc` 對照說明。
