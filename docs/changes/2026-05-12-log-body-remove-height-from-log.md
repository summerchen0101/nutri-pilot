# 每日紀錄身體卡：移除身高編輯（改由設定）

**日期**：2026-05-12  
**影響規格**：docs/06-pages.md  
**類型**：修改

## 原規格（近期稿）

紀錄頁 `tab=body` 「身體」卡包含身高調整（加減／更新）；身高欄為 `user_profiles.height_cm`。

## 實際做法

「身體」卡僅保留**體重**調整（加減步進、`logWeightForDateAction`）；**身高**不再於紀錄頁編輯，改由 **`/settings`** 身體數據（既有流程）。移除 **`saveHeightCmFromLogAction`** 及其自紀錄頁的呼叫；`LogPageContent` 不再為身體卡查詢 profile 身高。

## 原因

身高為個人檔長期欄位、與「當日日誌」語意區隔；縮短路徑並避免每日頁誤改代謝重算項。

## 後續

已更新 `docs/06-pages.md` `/log` 身體與習慣區塊說明。
