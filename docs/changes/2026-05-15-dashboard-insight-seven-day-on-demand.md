# 首頁「今日建議」改為近 7 日脈絡且點擊才呼叫 AI

**日期**：2026-05-15  
**影響規格**：docs/06-pages.md、docs/04-ai-engine.md  
**類型**：修改

## 原規格

- AI 今日建議卡：規則引擎產生 bullet，若有 `personal_context_facets` 則 client 自動 lazy load `/api/ai/dashboard-insight` 合併補充句（僅送當日營養數字）。

## 實際做法

- 首頁該卡片預設僅顯示說明與「AI 建議」按鈕；使用者點擊後才 `POST /api/ai/dashboard-insight`。
- API 於伺服端查詢過去 7 日 `food_logs`、`activity_logs`、`vital_logs`，並結合 `user_goals`、`user_profiles`（過敏／忌食／飲食法等 + 自述面向）組 prompt，請 Claude 輸出 3～4 則 bullet；移除首頁規則引擎 `buildInsightBullets`。
- 若近 7 日無飲食／運動／vital 紀錄且個人檔亦無自述面向／過敏／忌食／選定飲食法／血糖關注等額外脈絡，回傳固定引導 bullet、不呼叫模型。

## 原因

將建議奠基於使用者實際滾動一週行為並改為明示同意（點擊）後才呼叫 AI，以降低無感耗用與脈絡不足時的泛泛輸出。

## 後續

規格書已於 `docs/06-pages.md`、`docs/04-ai-engine.md` 同步更新。
