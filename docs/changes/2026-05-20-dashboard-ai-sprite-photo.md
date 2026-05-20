# Dashboard AI 精靈附圖快速紀錄

**日期**：2026-05-20  
**影響規格**：docs/04-ai-engine.md、docs/changes/2026-05-15-dashboard-ai-sprite.md

## 異動摘要

- AI 精靈 textarea 右下角新增附圖按鈕（拍照／選圖），可僅照片或照片＋文字後按「解析」。
- `POST /api/ai/quick-log` 接受可選 `imageBase64`／`imageMediaType`，經既有 `callClaudeJSON` Vision 同步解析，流程仍為預覽 → 確認寫入。
- Prompt 補強附圖、僅照片時依參考日推斷餐別；客戶端沿用 `compressImageForUpload`（≤2MB）。
- **附圖擴充**：Prompt 支援依照片＋文字辨識 quick-log 五類（飲食／運動／體重／飲水／睡眠）；無法辨識時回空 entries，UI 以中性提示區顯示支援範圍（非 422 紅色錯誤）。
- 附圖預覽為元件 local state，不寫入 zustand persist；寫入仍為 `method: ai_analysis`，不上傳 `food-photos`。

## 原因／後續

- 降低「拍早餐說一句話」摩擦；與紀錄頁 Queue 拍照辨識路徑分離（精靈需多類型 quick-log entries）。
- 可選：於 `docs/07-api.md` 補 quick-log 契約；若需留存原圖再評估 storage。
