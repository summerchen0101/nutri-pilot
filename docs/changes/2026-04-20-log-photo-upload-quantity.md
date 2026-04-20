# /log 拍照：自訂上傳區、實際份量換算、移除「已調整」

**日期**：2026-04-20  
**影響規格**：docs/09-ui-design.md、docs/06-pages.md（/log 拍照）  
**類型**：修改

## 原規格

- 使用瀏覽器預設 `file` 輸入外觀。
- 營養結果卡無獨立份量欄位；份量改變未與 AI 原始值比例連動。
- 顯示「已調整」角標。

## 實際做法

- 隱藏 `input[type=file]`（`accept="image/*"`、`capture="environment"`），改為虛線框＋相機圖示＋「拍照或選擇相片」；選圖後改為 `h-48` 預覽與右上角「重新選擇」（辨識完成前）；分析中 Skeleton 不再重複預覽圖區塊。
- `NutritionResultCard` 新增「實際份量」數字欄（`min={1}`），以 `originalResult`（AI 初次正規化值）為基準，`ratio = 新份量 / originalResult.quantity_g` 一次換算熱量與碳水／蛋白／脂肪／纖維／鈉；inline 編輯 2×2 仍僅改當前顯示值，不寫回 `originalResult`。
- 移除「已調整」標示及相關比對邏輯。

## 原因

對齊 UI 設計（上傳區視覺、手機後鏡頭）、避免份量連續修改時比例漂移，並簡化營養卡提示。

## 後續

無。
