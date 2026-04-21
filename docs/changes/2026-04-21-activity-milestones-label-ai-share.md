# 運動紀錄、里程碑、標籤 AI、週報分享卡

**日期**：2026-04-21  
**影響規格**：docs/02-schema.md、docs/06-pages.md、docs/07-api.md、docs/04-ai-engine.md  
**類型**：新增

## 原規格

Schema 未包含運動紀錄表、里程碑表；拍照分析僅支援餐桌食物；Analytics 無分享週報圖；使用者無「血糖相關提醒」偏好欄位。

## 實際做法

1. **Migration `014_activity_milestones_label_jobs.sql`**
   - `activity_logs`：手動運動（類型、分鐘、估熱、備註）。
   - `user_milestones`：解鎖之里程碑鍵（冪等插入）。
   - `photo_analysis_jobs.job_kind`：`meal` | `label`（預設 `meal`）。
   - `user_profiles.tracks_glycemic_concern`：是否加強糖／血糖相關標籤提示。

2. **Edge**
   - `ai-photo-request`：body 可傳 `jobKind` / `job_kind`（`meal` | `label`）。
   - `ai-photo-analyze`：依 `job_kind` 分支；`label` 讀取 profile 後用 `_shared/label-analyze-prompt.ts`（Claude Vision）產出單一 JSON（含 `_kind: label_analysis`）。

3. **前端**
   - `/log`：`?tab=food|activity|label`；運動表單與列表、標籤拍照與結果卡（含免責）。
   - 設定：飲食偏好區新增「糖量／血糖相關提醒」開關。
   - Dashboard：`syncUserMilestones` 後顯示里程碑 chip、今日運動分鐘加總。
   - Analytics：週報區塊內嵌 `WeeklyReportShare`（`html2canvas`；Web Share 或下載 PNG）。

## 原因

落實產品規劃之黏著與資訊安全提示；沿用既有 Storage／QStash／Vision 管線降低維運成本。

## 後續

請於 Supabase 執行 migration 並重新部署 Edge Functions；補齊 `docs/02-schema.md` 與 API 文件之表格式條目（若需與程式長期同步）。
