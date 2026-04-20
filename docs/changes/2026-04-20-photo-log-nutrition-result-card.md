# 拍照辨識 Skeleton／共用營養結果卡／Prompt 完整營養素

**日期**：2026-04-20  
**影響規格**：docs/06-pages.md（/log 拍照記錄）、docs/09-ui-design.md、docs/04-ai-engine.md（拍照 prompt）、docs/07-api.md（ai-photo-analyze 輸出）  
**類型**：修改

## 原規格

- 拍照分析中為簡易 pulse 區塊，版面易跳動。
- 拍照結果僅列品名、份量、熱量與「確認加入紀錄」，與手動 AI 分析的 2×2 可編輯營養格不一致。
- Edge `PHOTO_ANALYZE_PROMPT` 回傳純陣列、僅基本巨量營養素。

## 實際做法

- 選檔後即以 `URL.createObjectURL` 建立預覽；分析中顯示固定高度（`h-48`）預覽圖 + Skeleton（含 2×2 格與主按鈕占位）+「AI 辨識中」文案。
- 新增共用元件 `src/components/food/NutritionResultCard.tsx`（與原手動輸入結果區塊相同：信心標、2×2 inline edit、已調整、纖維／鈉、低信心警示、`加入{餐次}`）。
- 手動輸入改為使用 `NutritionResultCard`；拍照結果同一元件並傳入 `previewImageUrl`。
- `PHOTO_ANALYZE_PROMPT` 置於 `src/lib/food/prompts.ts`，與 `supabase/functions/_shared/photo-analyze-prompt.ts` 同步；模型回傳單一 JSON 物件（整餐一筆），含 `quantity_description`、`fiber_g`、`sodium_mg`、`confidence`、`note` 等；Edge 解析支援單一物件或陣列（相容舊資料）。
- `confirmPhotoItemsAction` 寫入 `fiber_g`、`sodium_mg`、`brand`、`is_verified`。

## 原因

對齊 `docs/06-pages.md`／`docs/09-ui-design.md` 的拍照流程與指標格規範，並讓使用者於寫入前可編輯與手動輸入相同的營養欄位。

## 後續

建議將 `docs/04-ai-engine.md`、`docs/07-api.md` 中拍照 prompt／輸出範例改為「單一 JSON 物件 + 完整營養欄位」以保持文件與實作一致。
