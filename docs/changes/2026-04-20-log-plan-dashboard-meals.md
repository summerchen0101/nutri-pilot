# 飲食記錄預填與 Dashboard 今日餐食對比

**日期**：2026-04-20  
**影響規格**：docs/06-pages.md  
**類型**：修改

## 原規格

- `/log` 由計畫進入時以 Card「調整計畫餐」呈現；存檔後以 `router.replace` 留在紀錄頁。  
- Dashboard「今日餐食」以打卡／摘要為主，未區分計畫 vs 實際與 `log_type`。

## 實際做法

- **紀錄頁**：`?from_meal_id=` 時改為頂部提示卡（`#EBF5EF`／`#C8E6D4`）、區塊「計畫食材（可調整）」、可刪除列、可選「新增其他食物」以搜尋暫存進同一筆存檔（單次 `commitPrefillFromPlanAction`，`log_type`／`from_plan_meal_id` 不變）；成功後 `router.back()`；一般進入時支援 URL `meal_type` 對應預設餐次 Tab；`LogClient` 外包 `Suspense` 以配合 `useSearchParams`。  
- **Dashboard**：Server 並行查詢今日 `daily_menus.meals`（含 `meal_items`）與今日 `food_logs`（含 `log_type`），依四餐合併為：照計畫／有調整／計畫未紀錄／無計畫自行記錄／不顯示；色點與文案依需求；未紀錄之計畫餐右側為「記錄」連至 `/log?meal_type=…`。  
- **Server Action**：計畫預填存檔後 `revalidatePath('/dashboard')`。

## 原因

與計畫打卡（照吃／調整）與 `food_logs.log_type` 設計對齊，讓總覽能反映計畫與實際差異，並完成從計畫頁進入紀錄後返回上一頁的流程。

## 後續

可視需要將 `docs/06-pages.md` 的 Dashboard／log 段落更新為上述細節。
