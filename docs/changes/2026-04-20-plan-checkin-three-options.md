# 飲食計畫頁：三選項打卡與計畫／紀錄連動

**日期**：2026-04-20  
**影響規格**：docs/03-features.md（P2 計畫打卡）、docs/06-pages.md（`/plan` 打卡、`/log`）  
**類型**：修改

## 原規格

- `/plan` 每餐單一打卡按鈕，更新 `meals.is_checked_in = true`（06-pages 範例亦同）。

## 實際做法

- 每餐以 **Secondary 風格「打卡」** 觸發選單，三選項：
  - **照計畫吃了（✓）**：`meals.is_checked_in = true`、`checkin_type = 'exact'`，並以 `copyMealToLog` 建立 `food_logs`（`method = 'from_plan'`、`log_type = 'from_plan'`、`from_plan_meal_id`）及 `food_log_items`；成功顯示「已記錄，熱量已加入今日統計」固定底層提示。
  - **有點不一樣（✎）**：`meals.checkin_type = 'modified'`（`is_checked_in` 不變），導向 `/log?from_meal_id=...`；伺服器依餐次帶出菜單日與食材預填，使用者確認後以 `commitPrefillFromPlanAction` 寫入（`method = 'manual'`、`log_type = 'from_plan_modified'`），再將 `is_checked_in = true`。
  - **沒吃這餐（✗）**：`is_checked_in = false`、`checkin_type = 'skipped'`，**不**建立 `food_logs`；該餐區塊以灰字＋刪除線呈現。
- **`daily_menus` 完成度**：一餐視為「已處理」若 `is_checked_in` **或** `checkin_type = 'skipped'`（見 `refreshDailyMenuCompletion`，`src/lib/plan/menu-completion.ts`）。
- **資料庫**：新增 migration `010_food_logs_method_from_plan.sql`，將 `food_logs.method` CHECK 擴充為包含 `'from_plan'`（原初始化僅允許 manual／photo／search）。
- **`src/types/supabase.ts`**：手動補上 `meals.checkin_type`、`food_logs.from_plan_meal_id`／`log_type`（與 migration 009／010 對齊）。

## 原因

- 產品需求改為區分照吃／調整／跳過，並與 `food_logs`、熱量統計一致；原單鍵打卡無法表達語意。

## 後續

- 可將 docs/06-pages.md 打卡程式範例更新為三選項與 `copyMealToLog` 流程（本次以異動紀錄為準）。
