# AI 月度額度與設定頁

**日期**：2026-05-15  
**影響規格**：docs/04-ai-engine.md、docs/06-pages.md（設定頁區塊）  
**類型**：新增

## 原規格

- AI 成本僅於文件中以「估計值」描述，未要求使用者可見月度額度或 DB 紀錄。
- `user_profiles` 未定義會員方案欄位與 AI 額度對應。

## 實際做法

- **DB**：`user_profiles.membership_plan`（`free | plus | pro`，預設 `free`）；`ai_usage_events` 紀錄每次 Claude 呼叫之 token 與 **`quota_used`（AI 額度）**，`billing_month` 為 Asia/Taipei 之 `YYYY-MM`。RLS：使用者僅可讀取自己的事件；寫入僅能透過 service role（Edge / 伺服端）。
- **RPC**：`get_monthly_ai_quota_used(p_month)` 供登入者加總當月 AI 額度。（初版曾為 `cost_ntd`／`get_monthly_ai_usage_ntd`，已於 029 migration 調整。）
- **上限**：免費／進階／專業之每月 **AI 額度** 上限與原 NT 方案強度對齊（見 `getAiMonthlyCapUnits`）；費用以每百萬 token 美元單價估算美金後 × `AI_QUOTA_UNITS_PER_USD`（預設 3000）。
- **設定頁**：於「帳號管理」區塊下方新增「AI 使用額度」卡片（進度、％、主按鈕開啟 Bottom Sheet；畫面僅顯示 AI 額度，不顯示幣別金額）。

**後續修訂**：見 [2026-05-16-ai-quota-units-usd.md](2026-05-16-ai-quota-units-usd.md)（改為 `quota_used`、RPC `get_monthly_ai_quota_used`、畫面僅顯示 AI 額度）。

## 原因

產品需讓使用者依方案理解 AI 估算用量；與訂閱／金流同步之 `membership_plan` 可由後續藍新 notify 或後台寫入。

## 後續

- 若需「超額即拒絕 AI」，於 Edge／API 開頭查 RPC 並回 402/429 等。
- 建議將 `membership_plan` 與實際付款狀態於金流整合完成後寫回。
