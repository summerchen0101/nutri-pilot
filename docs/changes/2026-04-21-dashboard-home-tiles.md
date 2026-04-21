# Dashboard 首屏：昨日熱量、運動／喝水卡與快速操作調整

**日期**：2026-04-21  
**影響規格**：docs/06-pages.md（`/dashboard` 區塊表列未涵蓋之細節）  
**類型**：新增 | 修改

## 原規格

- `docs/06-pages.md` 僅列「快速操作列」為五項入口按鈕列，未描述首屏體重旁「今日熱量」小卡、喝水格子位置，亦未列「昨日熱量」或「運動紀錄」摘要卡。

## 實際做法

- **今日熱量**（`MetricTile`）：在目標／尚可攝取文案下增加一行「昨日 *n* kcal」；昨日熱量由既有 streak 區間內 `food_logs` 彙總 `kcalByDate` 取前一日，不另開 food API。
- **第二列雙卡**：左為「運動紀錄」，連至 `/log?tab=activity`，顯示今日 `activity_logs` 分鐘合計與 `calories_est` 合計（有則顯示估消耗）；右為「喝水量紀錄」，顯示今日 `water_ml` 並內嵌原 `DashboardWaterGrid` 點格調整。
- **快速操作列**：移除與五鈕並排的右側喝水小工具；喝水調整改僅由「喝水量紀錄」卡完成。
- **Server**：`page.tsx` 並行查詢當日 `activity_logs`（`duration_minutes`, `calories_est`）。

## 原因

與產品首屏資訊優先順序一致：熱量對比、運動與喝水集中於指標格，快速操作列維持五捷徑即可。

## 後續

可將 `docs/06-pages.md` 的 `/dashboard` 表格補上「今日熱量」「運動紀錄」「喝水量紀錄」列與快速操作列現況。
