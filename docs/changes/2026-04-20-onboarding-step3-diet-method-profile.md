# Onboarding Step 3 合併飲食法並寫入 user_profiles

**日期**：2026-04-20  
**影響規格**：`docs/03-features.md`、`docs/09-ui-design.md`  
**類型**：修改

## 原規格

Onboarding 為 5 步驟，Step 5 才選擇飲食法與計畫天數，並寫入 `diet_plans`，完成後觸發後續流程。

## 實際做法

- Onboarding 採 4 步驟，移除獨立 Step 5（計畫天數）。
- Step 3 合併為「飲食偏好 + 飲食法」，寫入 `user_profiles`：
  - `diet_type`
  - `diet_method`
  - `avoid_foods`
  - `allergens`
- 飲食法選擇區顯示每種方法的簡短說明，並新增提示文字：
  - `此設定用於商城的個人化推薦，日後可在設定中修改`
  - 樣式為 `11px`、`#9298A8`。
- 完成 Step 4 後改為：
  1. 寫入 `user_goals`
  2. 非同步觸發 `POST /api/recalculate-scores`（不 `await`）
  3. 直接導向 `/dashboard`
- URL `step` 參數與進度指示同步為 1-4。
- 移除 Onboarding 內對 `diet_plans` 的 INSERT 流程。

## 原因

產品調整為以 `user_profiles.diet_method` 作為商城個人化推薦訊號，不再由計畫天數驅動 onboarding 完成條件。

## 後續

- `docs/03-features.md` 已同步回寫為 4 步驟描述。
- 既有 `diet_plans` 資料表暫時保留，供既有 `/plan` 模組與歷史資料相容。
