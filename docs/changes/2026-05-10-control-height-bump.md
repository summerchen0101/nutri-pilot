# 表單控制項高度與按鈕 padding 略增

**日期**：2026-05-10  
**影響規格**：docs/09-ui-design.md、.cursor/rules/05-ui-design.mdc  
**類型**：修改

## 原規格

- Primary 按鈕：`padding: 9px 18px`；無統一 `min-height`。  
- Small 按鈕：`padding: 5px 12px`。  
- 輸入框：`padding: 9px 12px`，實作多為固定高度 40px（`h-10`）。

## 實際做法

- `Button` default：`min-height` 44px（Tailwind `min-h-11`）、垂直 padding 11px；水平維持 18px。  
- `Button` sm：`min-height` 40px（`min-h-10`）、垂直 padding 7px。  
- `Input` 與共用樣式之 `<select>`：控制高度約 44px（`h-11`），並與按鈕視覺對齊；散落頁面的手刻 input／數量鈕／pill 一併略增高。  
- `SegmentedTabs`、紀錄／活動 log 餐別 pill、部分連結式 CTA 同步調整。

## 原因

提升主要互動列的可點擊區域與閱讀舒適度，並讓輸入框與主按鈕在同一列時高度一致。

## 後續

已更新 `docs/09-ui-design.md` 與 `.cursor/rules/05-ui-design.mdc`；新稿以更新後數字為準。
