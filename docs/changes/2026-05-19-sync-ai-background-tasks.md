# AI 精靈與飲食脈絡：背景同步 AI

**日期**：2026-05-19  
**影響規格**：docs/06-pages.md（Dashboard AI 精靈、設定頁健康脈絡）、docs/04-ai-engine.md

## 異動摘要

- **AI 精靈**（`POST /api/ai/quick-log`）與 **飲食脈絡整理**（`POST /api/ai/personal-context/analyze`）改由 `pending-analysis-jobs-store` 發起 `fetch`，離開頁面／關閉 Sheet 後請求仍完成。
- 完成且不在原場景時 toast：精靈為「非 `/dashboard` 或 Sheet 已關」；脈絡為「非 `/settings`」。
- 回到總覽／設定可還原輸入、解析結果或預覽；`sessionStorage` 保留進行中／`ready` 未處理狀態。
- 仍為 **client 同步 API**，未改 QStash／job 表（與拍照／守衛 Queue 不同）。

## 原因／後續

- 與記錄／守衛背景 UX 對齊，無需將輕量同步任務改 Queue。
- 可選：bottom nav 進行中指示。
