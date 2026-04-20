# 移除飲食計畫模組（方案 B）

**日期**：2026-04-20  
**影響規格**：`docs/03-features.md`、`docs/02-schema.md`、`docs/06-pages.md`、`docs/07-api.md`  
**類型**：修改

## 原規格

Onboarding 會建立 `diet_plans`，並由計畫流程驅動每日菜單（`daily_menus`、`meals`）與 `/plan` 頁，Dashboard 與 Log 可串接「照計畫打卡」。

## 實際做法

- 完全移除前端「飲食計畫」模組與路由（`/plan`）。
- 移除 AI 菜單請求與生成相關程式碼（API route + Edge Function）。
- `diet_method` 的實務讀寫來源改為 `user_profiles.diet_method`，Onboarding / Settings / Shop / 推薦重算邏輯已同步切換。
- Dashboard 移除所有計畫依賴，只保留手動/拍照記錄視角。
- `diet_plans` 表先不刪除，migration 先做資料搬移並將既有啟用資料改為 `is_active = false`。

## 原因

產品決策改為「不再提供每日菜單」，只保留飲食法與目標設定作為商城推薦依據，降低系統複雜度與維護成本。

## 後續

- 後續可在資料穩定後再評估移除 `diet_plans`、`daily_menus`、`meals` 相關 schema 與遺留欄位。
- 建議更新規格文件中所有 `/plan`、菜單生成、計畫打卡描述，避免與現況不一致。
