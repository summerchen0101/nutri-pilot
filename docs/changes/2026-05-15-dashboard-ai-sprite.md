# Dashboard「AI 精靈」自然語言快速紀錄（含 Web Speech 語音）

**日期**：2026-05-15  
**影響規格**：docs/00-overview.md、docs/06-pages.md、docs/07-api.md  
**類型**：新增 | 與 MVP 排除項目差異（語音）

## 原規格

- `docs/00-overview.md` MVP 明確排除「語音輸入」。
- `docs/06-pages.md` `/dashboard` 列有「AI 今日建議卡」與快速操作，未描述自然語言／精靈一站式寫入紀錄。
- `docs/07-api.md` 未列出 `/api/ai/quick-log`。

## 實際做法

- 儀表板頁首動作列新增 **AI 精靈**（Sparkles），開啟 Bottom Sheet：文字輸入 → `POST /api/ai/quick-log`（Claude 同步 JSON）→ **預覽後確認** → 呼叫既有 Server Actions 寫入 `food_logs`、`activity_logs`、`vital_logs`。
- 語音：以瀏覽器 **Web Speech API**（`zh-TW`）轉成文字後走同一解析流程；無額外套件、依賴裝置／瀏覽器支援。
- `addFoodFromAiAnalysisAction` 成功後補上 `revalidatePath('/dashboard')`，使儀表板與紀錄較一致更新。

## 原因

- 降低飲食／運動／生活數據紀錄摩擦；預覽確認避免誤寫入。
- 語音採 Web API 以控制工時與後端成本；與原「排除語音」之差異為產品決策與實作範圍擴充。

## 後續

- 若需全平台一致 STT 品質，再評估 Edge + 雲端轉寫並更新 `docs/07-api.md`。
- 建議回頭在 `docs/06-pages.md`、`docs/00-overview.md` 正文補一句精靈與語音策略（本檔先記錄差異）。
