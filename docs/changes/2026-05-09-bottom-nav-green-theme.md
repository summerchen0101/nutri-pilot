# 底部導覽改為綠底白字與白底 active 藥丸

**日期**：2026-05-09  
**影響規格**：docs/09-ui-design.md  
**類型**：修改 | UI

## 原規格

底部導覽：`background` 為主要背景色（白）、細邊框；nav item 次要文字色；active 為 `#E8F5EE` 背景 + `#4C956C` 文字（約 § 底部導覽 291–308 行）。

## 實際做法

1. 整條底欄改為 Sea Green（`--primary` / `bg-primary`），頂部以 `border-white/10` 與內容區略作分隔；移除原先大區塊陰影。
2. 非選取項目：`text-white/70`、`font-medium`。
3. 選取項目：白底圓角藥丸（`bg-white`、`rounded-[10px]`）、`text-primary`（品牌綠）、略放大的 icon／stroke、極輕 `scale-[1.02]`、`min-h-[44px]` 觸控區。
4. Focus：`focus-visible:ring-white/80`、`ring-offset-primary`；active 連結加 `aria-current="page"`；nav 字重維持 500 以下（`font-medium`）。

## 原因

產品需求強化底部導覽識別度與 active 對比，改為綠底白字與反轉式選取樣式。

## 後續

若此視覺為永久方向，建議更新 `docs/09-ui-design.md` § 底部導覽的 CSS 範例與說明，與實作一致。
