# Dashboard AI 建議：納入設定「飲食與脈絡」與「健康與目標」

**日期**：2026-05-15  
**影響規格**：docs/04-ai-engine.md、docs/06-pages.md  
**類型**：修改

## 原規格

- `POST /api/ai/dashboard-insight` 於近 7 日紀錄外，以 `user_profiles` 習慣欄位、`personal_context_facets` 與 `user_goals.daily_cal_target` 組 prompt。

## 實際做法

- **user_profiles** 增查 `height_cm`、`weight_kg`、`bmi`、`bmr`、`tdee`；**user_goals** 增查作用中列之 `type`、`target_weight_kg`、`weekly_rate_kg`、`daily_cal_target`、`target_date`。
- Prompt 分為「飲食與脈絡（設定）」＋「健康與目標（設定）」兩段標題，對齊 `/settings` UI 語意；並在系統指令中要求優先對照此二段與 rolling 紀錄。
- 無滾動紀錄時，`hasProfileExtras` 亦接受「有效身高體重」或「有作用中 goal 列」視為可呼叫脈絡。

## 原因

讓首頁 AI 建議與使用者在設定頁實際編輯之飲食／健康資訊一致，避免僅有熱量目標單欄而缺少目標類型與身體試算脈絡。

## 後續

已更新 `docs/04-ai-engine.md`、`docs/06-pages.md`。
