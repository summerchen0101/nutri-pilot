# Dashboard 今日飲水格子：固定 12 格／3000ml 與超目標淺藍

**日期**：2026-04-21  
**影響規格**：[`docs/changes/2026-04-21-dashboard-home-calorie-removal.md`](2026-04-21-dashboard-home-calorie-removal.md)（先前寫「八格點選」已過時）、[`docs/changes/2026-04-21-dashboard-water-grid-home.md`](2026-04-21-dashboard-water-grid-home.md)（先前寫「最多 8 格視覺上限」已過時）  
**類型**：修改

## 原規格

- 早先 changelog 將首頁喝水格描述為八格或 8 格視覺上限；填滿統一為第三色實心藍 `#378ADD`。

## 實際做法

- **`DashboardWaterGrid`**：維持 **12 格**、每格 **250 ml**，視覺總容量 **3000 ml**（常數本就如此，此行為為產品確認）。
- **`waterTargetMl`**（目前由 `DASHBOARD_WATER_TARGET_ML = 2000` 傳入）視為「目標」：累積至目標內（含未滿一格內未跨目標之 ml）使用實心藍 `#378ADD`；**超過目標**之滿格與片段使用淺藍 **`#B5D4F4`**（與 UI 規範第三色／AI 淺色系一致）。
- 若同一格內同時含「未達目標」與「超過目標」之水量（目標 ml 落在該格區間內），該格以左右兩段分別填實心藍與淺藍。
- 若未傳有效 `waterTargetMl`（`target <= 0`），格子填色維持原本單色藍行為。

## 原因

產品需求：首頁今日飲水固定以 12 格表達最高 3000 ml，預設目標仍 2000 ml；超標段需與達標段視覺區隔。

## 後續

可將 `docs/06-pages.md` 或相關首屏說明更新為「12 格／3000 ml、目標 2000 ml、超標淺藍」；舊 changelog 僅作歷史參考，不必逐份改寫正文。
