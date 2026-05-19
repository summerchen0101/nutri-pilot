# 過往紀錄列表與唯讀詳情

**日期**：2026-05-20

**影響規格**：`docs/06-pages.md`（`/log` 區塊）

**異動摘要**：

- 新增 `/log/history`：依日期列出飲食／運動／體重習慣摘要；`/log` 頁首 History 圖示進入。
- 昨天列「修改」→ `/log?date=` 完整補登與編輯；今天→ `/log`；更早→ `/log/history/[date]` 三 Tab 唯讀詳情。
- 直接開 `/log?date=` 且早於昨天時 redirect 至唯讀詳情。
- Server Actions（飲食刪改、運動、生活指標）僅允許今日與昨日寫入；`food_log_items` 更新改走 `updateFoodLogItemAction`。
- `/log`、過往詳情與 `/log/history` 列表的當日總 kcal：與 Dashboard 圓環共用門檻（≥90% 橘、超標紅）；邏輯抽至 `lib/calorie/calorie-intake-status.ts`。

**原因／後續**：補「查看過往＋僅昨日可改」產品規則；可視需要回寫 `docs/06-pages.md` 正式路由表。
