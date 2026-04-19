# 飲食紀錄：三層食品搜尋（快取 → USDA → Claude）

**日期**：2026-04-19  
**影響規格**：docs/03-features.md（P2-3）、docs/06-pages.md  
**類型**：修改 | 新增

## 原規格

- `docs/06-pages.md`／既有實作以 Open Food Facts（OFF）為補來源，`searchFoods` 會合併快取與 OFF。
- `food_cache` 無別名 RPC 時，應用端僅能以 `name` ILIKE 查詢。

## 實際做法

1. **三層策略**（`src/lib/food/search.ts`）：  
   - **快取**：`match_food_cache(p_query)`（`name`／`alias` ILIKE，`is_verified` 優先）；≥3 筆即回傳。RPC 未定義時後援為僅 `name` ILIKE。  
   - **USDA**：`POST` 等價查詢 `GET /fdc/v1/foods/search`，`dataType=Branded` + `Foundation`，`pageSize=5`；結果 `is_verified=true`、`source=usda`、`external_id=fdcId`；**非同步**寫入 `food_cache`（不 await）。熱量等若搜尋結果缺漏，再以 `GET /fdc/v1/food/{fdcId}` 補齊。  
   - **Claude**：僅快取與 USDA 皆無結果時呼叫 `callClaudeJSON`；`prompt` 放於 `src/lib/food/prompts.ts`（`FOOD_ESTIMATE_PROMPT`）；回傳 `source=ai_estimate`、`is_verified=false`，**不寫入** `food_cache`。  
2. **API 金鑰**：`USDA_API_KEY`、`ANTHROPIC_API_KEY` 僅於 Server Action／伺服端讀取（見 `.env.local.example`）。  
3. **UI**（`src/app/(main)/log/log-client.tsx`）：依 `source`／`is_verified` 顯示綠／藍／黃來源標示；`ai_estimate` 須勾選確認後才可「加入紀錄」，並由 `addFoodFromSearchAction` 強制檢查 `confirmedAiEstimate`。  
4. **資料庫**：新增 `supabase/migrations/005_match_food_cache_search.sql`（`match_food_cache`）。  
5. **型別**：手動擴充 `src/types/supabase.ts` 的 `food_cache` 與 `Functions.match_food_cache`（待之後 `supabase gen types` 再對齊）。

## 原因

- 優先使用官方／已驗證快取與 USDA，降低僅依賴 OFF 與單一 API 的限制。  
- 別名搜尋需資料庫層組合條件，RPC 較 PostgREST 篩選一致。  
- AI 估算需明確標示並由使用者確認後才能寫入紀錄。

## 後續

- 於 Supabase 套用 `005_match_food_cache_search.sql` 後執行 `supabase gen types` 更新型別。  
- 若需將 `match_food_cache` 列進正式規格，可同步更新 `docs/02-schema.md`／`docs/06-pages.md`。
