# AI 額度改為「美金估算 × 單位」、下架台幣欄位

**日期**：2026-05-16  
**影響規格**：docs/changes/2026-05-15-ai-monthly-quota-settings.md、docs/04-ai-engine.md（成本敘述語意）  
**類型**：修改

## 原規格

- `ai_usage_events` 以 `cost_ntd` 儲存台幣估算，RPC `get_monthly_ai_usage_ntd` 加總；設定頁顯示 NT$。

## 實際做法

- 欄位改為 `quota_used`（AI 額度）；單次消耗 = API 美金估算 × `AI_QUOTA_UNITS_PER_USD`（預設 3000，即 1 美金 = 3000 AI 額度）。
- RPC 改為 `get_monthly_ai_quota_used`；既有 `cost_ntd` 列若已存在資料，migration 以 `÷32×3000` 近似轉成額度（對應先前 `×32` 台幣假設）。
- 設定頁只顯示「AI 額度」與百分比，不出現新台幣或美金金額標籤。

## 原因

產品要以抽象「AI 額度」與使用者溝通，並以美金計價邏輯在後端換算。

## 後續

- 若需改「每美金額度」或月上限演算法，調整 `AI_QUOTA_UNITS_PER_USD` 與 `getAiMonthlyCapUnits`。
