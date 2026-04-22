# 底部導覽：視覺層級與對比強化

**日期**：2026-04-22  
**影響規格**：docs/09-ui-design.md  
**類型**：修改 | UI

## 原規格

docs/09-ui-design.md 全站邊框原則為極細（0.5px）；bottom nav 先前為 `border-t border-[0.5px] border-border`、未選中 `text-muted-foreground`、選中 `text-primary`（主色本體綠）於淡綠底上。

## 實際做法

1. 容器上邊改為 **`border-neutral-border-secondary`（#D5D7DE，預設 1px）**，並加 **極輕向上陰影** `shadow-[0_-4px_16px_-2px_rgba(30,33,43,0.06)]`，與主內容區分更清楚。
2. 未選中改 **`text-neutral-text-secondary`**；icon `strokeWidth` 2。選中改 **`text-primary-foreground`（#2D6B4A，對齊「淡綠底上主色文字」）**、**`font-semibold`**，icon 略大與加粗筆劃（2.25）。
3. 連結補 **focus ring**（`ring-ring`），並 `outline-none` 以免與全域 outline 重疊。

## 原因

主導覽需更明顯的層次與可讀性；與 UI 色彩表一致（active 文字用主色文字而非主色本體）。底欄為**層級強化例外**，不影響全站 0.5px 邊框的一般原則。

## 後續

若要在規格書中明文化「底欄可採 1px ＋ 陰影」，可於 docs/09-ui-design.md 補一段 bottom nav 專用說明。
