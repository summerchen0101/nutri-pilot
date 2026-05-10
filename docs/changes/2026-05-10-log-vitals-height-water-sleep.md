# 每日紀錄：身體與習慣（身高、體重、飲水、睡眠）

**日期**：2026-05-10
**影響規格**：docs/06-pages.md、docs/02-schema.md
**類型**：新增

## 原規格

- `docs/06-pages.md` 之 `/log` 僅列飲食／運動與熱量加總，未描述身體、飲水、睡眠。
- `docs/02-schema.md` 之 `vital_logs` 不含睡眠欄位；概覽曾排除「睡眠詳細記錄與圖表」。

## 實際做法

- **Schema**：`vital_logs` 新增可為 NULL 之 `sleep_hours NUMERIC(4,1)`，並以 CHECK 限制 **0–24 小時**（migration `019_vital_logs_sleep_hours.sql`）。
- **每日紀錄頁**：依 URL `?date=` 讀寫同一列 `vital_logs`（體重、飲水、睡眠）；**身高**從 `user_profiles.height_cm` 編輯，與設定頁共用。
- **歷史日期的體重**：僅 upsert 該日 `vital_logs`；**不**更新 `user_profiles.weight_kg` 與代謝。**今日**體重與既有儀表板行為一致（同步 profile 與 `user_goals.daily_cal_target`）。
- **飲水**：複用儀表板 `DashboardWaterGrid`，以 `forDateIso` 寫入選定日之 `water_ml`；merge 時保留同列體重與睡眠。

## 原因

在低摩擦紀錄流程中集中「當日維度」；睡眠以**單欄時數**涵蓋，與排除項目所指的「詳細睡眠圖表／多階段紀錄」區隔。

## 後續

- 可視需要更新 `docs/00-overview.md` 若產品敘述要提及每日睡眠欄位。
- `/analytics` 若需睡眠趨勢圖，可另開迭代取自 `vital_logs.sleep_hours`。
