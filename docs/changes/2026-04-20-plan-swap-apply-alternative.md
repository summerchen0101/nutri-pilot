# 飲食計畫：更換按鈕文案與套用替代食材

**日期**：2026-04-20  
**影響規格**：docs/06-pages.md、docs/03-features.md  
**類型**：修改

## 原規格

換食材按鈕為「換」；替代食材彈窗僅展示 AI 建議，未寫回計畫菜單。

## 實際做法

- 列表按鈕文案改為「更換」。
- 彈窗內每個替代方案為可點選按鈕；點選後以 Server Action `applySwapAlternativeAction` 更新 `meal_items`，並重算該 `meals.total_calories` 與 `daily_menus.total_calories`，接著 `revalidatePath('/plan')` 與前端 toast。
- 替代項目無纖維／鈉資料時將 `fiber_g`、`sodium_mg` 清空，避免沿用舊品項數值。
- 彈窗「原：…」中的餐別改為中文（沿用 `MEAL_LABEL`）。

## 原因

使用者需將建議食材真正代入當日菜單，而非僅供參考。

## 後續

可視需要將 `docs/06-pages.md` 換食材段落補上「點選後寫入資料庫」一行。
