# Onboarding 改為 4 步驟（移除計畫步驟）

**日期**：2026-04-20  
**影響規格**：`docs/03-features.md`、`docs/09-ui-design.md`  
**類型**：修改

## 原規格

Onboarding 為 5 步驟，最後一步建立 `diet_plans`（含計畫天數），並由完成 Step 5 作為主流程完成條件。

## 實際做法

- Onboarding 調整為 4 步驟：
  - Step 1 基本資料
  - Step 2 身體數據
  - Step 3 飲食偏好 + 飲食法
  - Step 4 目標設定
- Step 3 直接寫入 `user_profiles.diet_method`，不再寫 `diet_plans`。
- 移除「計畫天數」UI 與相關儲存邏輯。
- 新增飲食法提示文字：`11px`、`#9298A8`，說明其用途為商城個人化推薦。
- 完成 Step 4 後非同步呼叫 `/api/recalculate-scores`，再導向 `/dashboard`。
- Onboarding `step` URL 參數改為 `1-4`（超出值自動 clamp 到 4），進度顯示同步為 4 步。

## 原因

產品決策改為取消「每日菜單計畫」模組，保留飲食法只作為商城推薦訊號，因此 Onboarding 不再需要獨立計畫建立步驟。

## 後續

- 建議回寫 `docs/03-features.md` 的 P1-4 內容，將 5 步驟描述更新為 4 步驟版本。
