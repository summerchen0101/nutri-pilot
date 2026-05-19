# 食品安全守衛：各項目 Info 與包裝具名成分彈窗

**日期**：2026-05-19

**影響規格**：`docs/06-pages.md`（`/guard`）

## 異動摘要

- `label_guard_report` 新增可選 `label_name_details`（`match_key` + `label_names`），AI prompt 要求對齊警示／風險／過敏原列。
- 警示 chip、風險分級列、過敏原陽性列旁顯示 info 圖示（僅新報告有 `label_name_details` 且比對成功）；點 chip／列為通用說明，點 (i) 為本次包裝摘錄清單。
- 新增 `label-guard-label-names.ts`、`LabelGuardInfoTrigger`、`LabelGuardAlertChip`。

## 原因／後續

使用者需區分百科說明與該包裝成分表原文。舊儲存紀錄無 `label_name_details` 時不顯示 info，行為與先前一致。部署 `label-guard-analyze` 後新分析才會帶欄位。
