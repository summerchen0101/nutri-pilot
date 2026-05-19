# 食品安全守衛：添加物類別與高鈉警示加強

**日期**：2026-05-19

**影響規格**：`docs/06-pages.md`（`/guard`）、`docs/04-ai-engine.md`（`label-guard-analyze` prompt）

## 異動摘要

- `label-guard-report-prompt` 新增食品添加物功能類別掃描指引（膨鬆劑、調味劑、增色劑等）與 tier 對照；高鈉依每 100g／100ml 或每份 ≥600mg 必須輸出警示。
- `label-guard-lookups` 擴充類別／具名添加物／高鈉別名，警示 chip 可點開說明。
- Edge `enrichLabelGuardReport` 後處理：補「高鈉」關鍵字與 risk 列、從 risk_items 補 alert、high tier 時安全分數下修。
- `LabelGuardReportBody` 小標改為「成分、添加物與風險分級」，risk_items 依 tier 排序。

## 原因／後續

使用者需更易辨識加工食品化學添加物與高鈉；以 prompt＋查表＋保守後處理達成，不變更 `label_guard_report` JSON 契約。部署後需 `supabase functions deploy label-guard-analyze`。
