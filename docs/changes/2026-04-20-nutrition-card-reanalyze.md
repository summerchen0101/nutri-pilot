# NutritionResultCard 新增重新分析

**日期**：2026-04-20  
**影響規格**：docs/06-pages.md、docs/09-ui-design.md（/log 手動與拍照營養卡）  
**類型**：修改

## 原規格

- 營養結果卡可修改名稱與份量，但無法在修改後重新呼叫 AI 估算。
- 名稱修改後沒有明確提示使用者需要重新分析。

## 實際做法

- 在 `NutritionResultCard` 的份量列（`g` 後方）新增常駐「重新分析」按鈕，點擊後呼叫同一個 `/api/ai/analyze-food` endpoint。
- 重新分析請求改用 `{ name, quantity }`，由後端改走 `buildReanalyzePrompt(name, quantity)`，直接估算該重量營養，不回傳 per 100g。
- 分析中顯示 spinner +「分析中」，完成後同步更新 `originalResult` 與 `displayResult`，並維持目前 `quantity` 不變作為新基準。
- 名稱被使用者修改時，在按鈕旁顯示 `名稱已修改` 提示字（11px amber 系）。
- 失敗時僅 `console.error`，不覆蓋目前顯示數值、不卡住 UI。

## 原因

使用者常在辨識後修正品名或份量，若只做比例換算會沿用舊基準，新增重新分析可讓 AI 依最新輸入重算，降低誤差。

## 後續

- 建議後續將此互動寫入正式規格（`docs/06-pages.md` / `docs/09-ui-design.md`）的營養卡操作流程。
