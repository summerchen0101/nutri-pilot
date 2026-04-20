# Log 頁：移除來源標示與紀錄列 inline 編輯

**日期**：2026-04-20  
**影響規格**：docs/06-pages.md、`/log` UI、NutritionResultCard、`ManualFoodAnalysisResult`  
**類型**：修改

## 原規格

飲食紀錄列表以來源色點／confidence／「估算」等區分資料來源；搜尋結果卡顯示信心度與備註；紀錄列僅供檢視與整筆 log 刪除。

## 實際做法

- 紀錄列左側圓點改為單一主色綠 `#4C956C`，僅作視覺引導；移除 title、confidence badge、來源文字與 AI 估算警示。
- `NutritionResultCard` 移除 confidence／note／低信心警示；加入流程改為與設計系統一致的 Primary（Shadow Grey）主按鈕；支援 `embedded` + `editMode`（取消／儲存修改）。
- 點擊紀錄列（含「更多 ›」以外已 `stopPropagation`）可展開 inline 編輯；`max-height` 200ms ease；同餐次內同時僅展開一筆；儲存以 Supabase `food_log_items` update 後以 `setDayLogs` 更新本地 state，不整頁 refetch。
- `ManualFoodAnalysisResult` 型別不再包含 `confidence`／`note`（AI prompt 仍可回傳多餘欄位，前端正規化時捨棄）。

## 原因

產品決策簡化來源資訊、聚焦編輯；inline 編輯降低跳頁成本並與新增流程共用同一套營養編輯邏輯。

## 後續

若需同步更新 docs/06-pages.md／docs/09-ui-design.md 中與「來源標示」相關的敘述，可另開文件修訂。
