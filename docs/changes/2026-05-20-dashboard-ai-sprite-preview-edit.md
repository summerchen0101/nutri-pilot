# Dashboard AI 精靈預覽修正（文字 + AI）

**日期**：2026-05-20  
**影響規格**：docs/changes/2026-05-15-dashboard-ai-sprite.md

## 異動摘要

- 解析完成後預覽區 **修正**：以 textarea 描述要怎麼改，按 **套用修正** 呼叫 `POST /api/ai/quick-log`（`revisionInstruction` + `currentEntries`），由 AI 重產 entries。
- 不修訂時重送原圖；仍為同步 client API + 預覽再確認寫入。
- 曾實作之手動表單改欄位已移除，改為上述流程。

## 原因／後續

- 降低逐欄位編輯摩擦；與「用自然語言紀錄」產品一致。
