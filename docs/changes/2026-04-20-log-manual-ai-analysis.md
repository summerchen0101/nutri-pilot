# 飲食紀錄改為手動描述＋AI 分析（取代多層搜尋）

**日期**：2026-04-20  
**影響規格**：docs/06-pages.md、docs/04-ai-engine.md、docs/09-ui-design.md  
**類型**：修改  

## 原規格

- `/log`「搜尋輸入」：`food_cache` → USDA → Claude 每 100g 估算之三層搜尋；結果列表選取後調整份量再加入。  
- `food_logs.method` 以 `search` 代表由搜尋加入。

## 實際做法

- 移除搜尋列表與 `searchFoods`／USDA／舊的每 100g Claude 估算流程；`lib/food/search.ts` 僅保留 `fetchFoodCacheHintsForManualInput` 供分析 API 參考 `food_cache`。  
- 新增 `POST /api/ai/analyze-food`：查詢 `food_cache` 提示詞附註後直接 `callClaudeJSON`（輕量、不走 Queue）。  
- 前端改為「手動輸入＋分析」輸入框與結果卡（可 inline 編輯巨量營養素、confidence 標示、低信心警示）。  
- 寫入 `food_logs.method = 'ai_analysis'`、`log_type = 'manual'`；成功後非同步插入 `food_cache`（`source=ai_estimate`、`is_verified=false`）。  
- DB migration：`food_logs_method_check` 新增允許值 `ai_analysis`。  

## 原因

台灣外食常以自然語言描述即可，不需精確英文名或品牌；直接由模型依份量估算總營養較符合使用情境。

## 後續

- 建議將 `docs/06-pages.md` `/log` 區塊更新為「手動輸入＋AI」與本流程一致。  
- 技術規則中「API Route 不寫後端邏輯」與此輕量 AI 直連並存時，於 `docs/04-ai-engine.md` 補一行「analyze-food 例外」即可。
