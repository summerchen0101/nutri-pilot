# Dashboard／飲食紀錄／飲食計畫 UI 結構調整

**日期**：2026-04-20  
**影響規格**：docs/06-pages.md、docs/09-ui-design.md  
**類型**：修改

## 原規格

- Dashboard：熱量圓環、今日餐食、AI 建議需依頁面規格呈現；連續打卡 badge。
- Log：列表資訊層次與來源標示方式。
- Plan：7 日日期選擇器水平滾動、今日／完成／未來 pill 狀態，菜單區標題與打卡／換食材樣式。

## 實際做法

### Dashboard（`src/app/(main)/dashboard/`）

- **Server**：在既有 profile／vital 之外，並行查詢今日 `food_logs`及項目、`user_goals`、`diet_plans`、今日 `daily_menus`（含 `meals`／`meal_items`）、 streak 視窗內之 `food_logs` 日期與 `daily_menus.is_completed`（依 `plan_id`），組成熱量／巨量營養、四餐列、連續天數與 AI 呼叫用快照。**未改** `logWeightAction` 等 mutation。
- **熱量圓環**：目標巨量以每日熱量目標按 50%／25%／25% 熱量配比換算為克數；今日 0 kcal 時顯示空環與「尚未記錄」。
- **連續天數**：由今日往前累計，當日需「有飲食紀錄」或「菜單日 is_completed」二者擇一即計入。
- **AI 建議**：新增 `POST /api/ai/dashboard-suggestion`，由 client 懶載入；`DashboardAiCard` 顯示 skeleton 後請求。

### 飲食紀錄（`src/app/(main)/log/log-client.tsx`）

- 移除整列 badge 與「與下方重複」的整筆加總列；每筆紀錄改為左側 **4px 來源色點**、食物名＋份量、單行 muted 巨量；右側 **垃圾桶 icon**（`hover:text-[#E55A3C]`）。
- **來源色**：`food_log_items` 未持久化 `source`，改以 `food_logs.method` 與 `is_verified` 推斷——**拍照**與**未驗證搜尋**為 `#EF9F27`（AI）；**已驗證搜尋**為 `#4C956C`（以本地／衛福部快取為主）。**無法**自資料庫區分 USDA 與衛福部已驗證品項，兩者目前皆為綠點。
- `page.tsx` 查詢補上 `is_verified` 並納入 `LogItemSnapshot`。

### 飲食計畫（`src/app/(main)/plan/plan-view.tsx`）

- 日期列：`overflow-x`、隱藏 scrollbar、`52×56` pill、上為日期數字（14px／500）、下為中文週縮寫（11px）；今日 `#1E212B`、已完成 `#E8F5EE`／`#2D6B4A`、其餘 `#F7F8F6`＋border。`useEffect` 將**今日** pill `scrollIntoView({ inline: 'center' })`。
- 菜單區標題固定為「**今日菜單**」；熱量目標行改為 13px muted＋數字 `text-xl`／`#1E212B`。
- 餐次：打卡改為 **pill 文字按鈕**（未打／已打）；食材「**換**」為 12px、ghost＋`0.5px` border。

## 原因

- 補齊 MVP 總覽資訊與設計稿層級，且不變更既有寫入／API 契約。
- Log 項目無來源 enum 欄位，色點僅能以現有 `method`／`is_verified` 近似規格三色。
- Plan 標題「今日菜單」為 UI 指示；選取非今日日期時，標題字面上仍為「今日」，與「依選取日載入菜單」並存。

## 後續

- 若需精確區分 USDA／衛福部，應於 `food_log_items`（或關聯）持久化 `source` 並於加入紀錄時寫入。
- 可將「今日菜單」改為「選取日菜單」或同步顯示選取日期，若產品要避免標題與資料日不一致。
