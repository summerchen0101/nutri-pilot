# `/log` 運動：底部選擇類型、成功提示、室內車／飛輪類型

**日期**：2026-05-12  
**影響規格**：docs/06-pages.md、`docs/02-schema.md`（`activity_logs.activity_type` CHECK）  
**類型**：修改 | 新增（DB 允許值）

## 原規格

- `/log` 運動分頁以表單手寫 `activity_logs`；`docs/06-pages.md` 未限定「類型」為 `<select>`；`activity_logs.activity_type` 受 migration 之 CHECK 約束列舉固定英文鍵。
- 規格未載明「新增成功」之即時提示元件型式。

## 實際做法

1. **UI**：類型由原生下拉改為 **`BottomSheetShell` 底部彈窗**，分組列出選項，點選即關閉並帶入。
2. **成功回饋**：`insertActivityLogAction` 成功後於表單卡片內顯示「已成功加入運動紀錄」約 3 秒後自動消失。
3. **類型擴充**：DB CHECK 與前後端白名單新增 `stationary_bike`（室內健身車）、`spin_bike`（飛輪）；估熱與中文標籤一併設定；運動類型常數集中於 `src/lib/activity/activity-types.ts`，分組見 `activity-groups.ts`。

## 原因

行動裝置上底部表單較易閱讀與點選；成功提示降低「是否已送出」不確定感；室內車／飛輪為常見有氧項目，需與既有一致之列舉與約束。

## 後續

- 需在目標環境套用 migration `026_activity_types_stationary_spin.sql`（`supabase db push` 等），否則新鍵會觸發 CHECK 錯誤。
- 如需，可將 `docs/06-pages.md` 運動分頁補一句「類型以底部表單選取」；結構化 `activity_type` 列舉可於 `docs/02-schema.md` 對照 migration 更新。
