# Phase 2：計畫頁、menu-request API、Edge ai-menu-generate

**日期**：2026-04-18  
**影響規格**：docs/03-features.md（P2-1、P2-2）、docs/04-ai-engine.md  
**類型**：技術替換 | 臨時決策

## 原規格

- Claude 呼叫透過 `lib/ai/claude.ts` 與 `@anthropic-ai/sdk`（Next 端）。
- QStash 發佈至 Supabase Edge Function Worker。

## 實際做法

1. **Supabase Edge Function** `supabase/functions/ai-menu-generate/index.ts` 使用 **`fetch` 呼叫 Anthropic HTTP API**，避免在 Deno 邊緣環境捆綁 SDK 的額外複雜度；與規格中「呼叫 Claude」一致。
2. **`tsconfig.json`** 將 **`supabase/functions`** 排除在 Next/TypeScript 編譯之外，否則 Deno 遠端 import 會讓 `next build` 失敗。
3. **`ANTHROPIC_MODEL`** 預設為 `claude-sonnet-4-20250514`，可環境變數覆寫（對應 Sonnet 4.x 系列 API id）。

## 原因

- Edge Runtime 與專案根 TypeScript 共用設定時，需排除 Deno 專用檔案。
- HTTP 呼叫 Anthropic 與官方 SDK 等價，利於 Deno 部署。

## 後續

- 若改為 Supabase 建議的 import map / 獨立 `deno.json`，可再把 Edge Function 納入型別檢查。
- 模型 id 若 Anthropic 更名，僅需更新預設 env 或文件。
- **`supabase/config.toml`** 已將 `ai-menu-generate` 設為 **`verify_jwt = false`**，以利 QStash 呼叫（無使用者 JWT）；正式環境仍應驗證 Upstash 簽章（見 `04-ai-engine.md`）。
