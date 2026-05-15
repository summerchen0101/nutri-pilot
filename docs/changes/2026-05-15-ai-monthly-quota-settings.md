# AI 月度額度（台幣估算）與設定頁

**日期**：2026-05-15  
**影響規格**：docs/04-ai-engine.md、docs/06-pages.md（設定頁區塊）  
**類型**：新增

## 原規格

- AI 成本僅於文件中以「估計值」描述，未要求使用者可見月度額度或 DB 紀錄。
- `user_profiles` 未定義會員方案欄位與 AI 額度對應。

## 實際做法

- **DB**：`user_profiles.membership_plan`（`free | plus | pro`，預設 `free`）；`ai_usage_events` 紀錄每次 Claude 呼叫之 token 與估算 `cost_ntd`，`billing_month` 為 Asia/Taipei 之 `YYYY-MM`。RLS：使用者僅可讀取自己的事件；寫入僅能透過 service role（Edge / 伺服端）。
- **RPC**：`get_monthly_ai_usage_ntd(p_month)` 供登入者加總當月台幣用量。
- **上限**：免費 NT$10／月、進階（plus）NT$50／月、專業（pro）NT$100／月；費用以環境變數可調之每百萬 token 美元單價 × `USD_TWD_RATE` 估算。
- **設定頁**：於「帳號管理」區塊下方新增「AI 使用額度」卡片（進度、％、主按鈕開啟 Bottom Sheet 說明）。

## 原因

產品需讓使用者依方案理解 AI 估算用量；與訂閱／金流同步之 `membership_plan` 可由後續藍新 notify 或後台寫入。

## 後續

- 若需「超額即拒絕 AI」，於 Edge／API 開頭查 RPC 並回 402/429 等。
- 建議將 `membership_plan` 與實際付款狀態於金流整合完成後寫回。
