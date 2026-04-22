# Dashboard 首屏恢復熱量圓環與三大營養素長條

**日期**：2026-04-22  
**影響規格**：docs/06-pages.md（`/dashboard` 熱量圓環卡）  
**類型**：修改

## 原規格

- [docs/06-pages.md](../06-pages.md) 列有「熱量圓環卡」：今日攝取／目標與碳水／蛋白／脂肪進度條。
- [2026-04-21-dashboard-home-calorie-removal.md](2026-04-21-dashboard-home-calorie-removal.md) 曾依產品調整移除首屏 `CalorieRingBlock`，造成實作與上列頁面規格不一致。

## 實際做法

- 於 `src/app/(main)/dashboard/dashboard-home.tsx` 還原 `CalorieRingBlock`（SVG 環狀進度 + 三條巨量營養），置於問候／日期列之下、體重與運動消耗雙卡之上。
- `src/app/(main)/dashboard/page.tsx` 將既有 `nutrientTotals` 與 `targetKcal` 傳入 `DashboardHome`。
- 巨量營養目標公式集中於 `src/lib/dashboard/macro-targets.ts`，供首頁圖表與 `buildInsightBullets` 共用。

## 原因

與頁面規格及使用者預期一致，首頁上方再次顯示熱量與營養素視覺化。

## 後續

若 `docs/06-pages.md` 之 `/dashboard` 表格需補列飲水整卡、運動消耗卡等後續迭代，可另開文件更新。
