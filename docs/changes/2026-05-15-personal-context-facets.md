# 個人化口述整理（多面向 JSON）與 AI 脈絡

**日期**：2026-05-15  
**影響規格**：`docs/02-schema.md`、`docs/06-pages.md`、`docs/04-ai-engine.md`  
**類型**：新增

## 原規格

- `user_profiles` 無存放「口述健康／飲食脈絡」之結構化欄位。
- 首頁「今日建議」主要為規則引擎；`ai_usage_events.source` 未含個人化整理與首頁建議專用值。

## 實際做法

- **DB**：`user_profiles.personal_context_facets`（`jsonb`，可 `null`）：儲存口述經 Claude 整理後之固定面向鍵（如 `conditions`、`family_history`、`summary_zh` 等）；**不儲存**原始長文。
- **設定頁**：開放式輸入 →「整理成重點」呼叫 `POST /api/ai/personal-context/analyze`（寫入 `ai_usage_events.source = personal_context_extract`）→ 預覽 →「確認套用」呼叫 `POST /api/ai/personal-context/confirm`；可「清除已儲存重點」。
- **AI 注入**：快速紀錄、儀表板個人化建議、Edge `ai-photo-analyze`、`label-guard-analyze` 將面向序列化為短附段餵入 prompt（與商城 `recalculate-scores` 規則分數無關）。
- **首頁**：仍有規則引擎 bullet；若已儲存面向，client 另請求 `POST /api/ai/dashboard-insight`（`source = dashboard_insight`）合併最多 2 則補充建議。
- **Migration**：`030_personal_context_facets.sql` 並擴充 `ai_usage_events_source_check`。

## 原因

口述內容需便利輸入，但持久化與下游 AI 應使用**一致、短、可審閱**的結構；避免長文直接進 prompt。

## 後續

- 正式環境需執行 migration。
- 若需後台檢視面向，可另開 admin 唯讀欄位。
