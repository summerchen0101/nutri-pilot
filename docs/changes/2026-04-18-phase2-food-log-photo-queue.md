# Phase 2：飲食紀錄 `/log`、食品搜尋、拍照 Queue

**日期**：2026-04-18  
**影響規格**：docs/03-features.md（P2-3）、docs/06-pages.md、docs/07-api.md  
**類型**：新增 | 修改 | 技術替換

## 原規格

- `/log`：搜尋可先查快取再查 OFF；拍照經 Queue；列表依餐次。
- **docs/06-pages.md**：搜尋「先查自建快取，有結果即回傳」。
- **docs/07-api.md**：寫入 `photo_analysis_jobs.result`（JSON）。

## 實際做法

1. **搜尋**：`src/lib/food/search.ts` 為 **快取 ILIKE + OFF API 合併去重**（見該檔註解），較接近實際 UX；與僅回快取之文字流程不同。
2. **拍照**：使用者 JWT 呼叫 **`ai-photo-request`**（建立 `photo_analysis_jobs`、`verify_jwt = true`）→ **QStash** → **`ai-photo-analyze`**（`verify_jwt = false`，與 `ai-menu-generate` 相同模式）；Vision 使用 **Anthropic HTTP API + base64**，prompt 見 `supabase/functions/_shared/photo-analyze-prompt.ts`（須與 `src/lib/ai/prompts/photo-analyze.ts` 同步）。
3. **DB 欄位**：結果寫入 **`photo_analysis_jobs.result_json`**（migration 002），非文件中的 `result`。

## 原因

- 合併搜尋可同時利用快取與 OFF，避免「快取無命中時空白」。
- Edge 沿用既有 QStash + service role Worker 模式；Next 不重複新增 `/api/ai/*` 路由。
- `tsconfig` 排除 `supabase/functions`，prompt 於 `_shared` 與 `lib/ai/prompts` 各有一份以避免跨編譯邊界問題。

## 後續

- **`EDGE_FUNCTIONS_URL`**：`supabase secrets set` **不可**使用 `SUPABASE_` 開頭名稱；Edge／Next 之 Queue 基底網址改用此變數（Next 仍可 fallback 讀取已存在的 `SUPABASE_FUNCTIONS_URL`）。
- 正式環境為 QStash callback **驗證 Upstash 簽章**（見 docs/04-ai-engine.md）。
- 若規格改為「僅快取」，可將 `searchFoods` 改為短路回傳。
