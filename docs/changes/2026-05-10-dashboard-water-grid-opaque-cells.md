# Dashboard 今日飲水：空格不透白底、快捷按鈕邊線

**日期**：2026-05-10  
**影響規格**：docs/09-ui-design.md（卡片疊層細節未寫）  
**類型**：修改  

## 原規格

總覽區塊內嵌 `DashboardWaterGrid` 沿用 `bg-muted/60` 空格底與 `border-border` 快捷鍵外框；在半透明大卡上對比偏弱。  

## 實際做法

- [`src/app/(main)/dashboard/dashboard-water-grid.tsx`](../src/app/(main)/dashboard/dashboard-water-grid.tsx)：未填滿格與 partial 格底由 `bg-muted/60` 改為 **`bg-card-opaque`**（與 `--card-opaque`／內嵌白底約定一致）。  
- 同檔「+250 ml」「+500 ml」按鈕邊線由 `border-border` 改為 **`border-neutral-border-secondary`**（較語意分明的灰邊）。  

## 原因

空格過透易與底圖混淆；快捷鍵細框在 `bg-secondary` 上不易辨識。  

## 後續

無。  
