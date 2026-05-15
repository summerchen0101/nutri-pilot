# 設定頁：移除糖量／血糖相關提醒開關

**日期**：2026-05-15  
**影響規格**：docs/06-pages.md、docs/02-schema.md（補述）  
**類型**：刪除（UI）；後端欄位保留  

## 原規格／先前狀態

設定頁曾以獨立 switch 維護 `user_profiles.tracks_glycemic_concern`，或將開關置於「飲食與脈絡」內卡片。

## 實際做法

- 設定頁不再提供「糖量／血糖相關提醒」switch；使用者若有相關留意，請於「健康脈絡」口述草稿中描述，由 AI 整理入 `personal_context_facets`。
- 已刪除 Server Action `saveTracksGlycemicConcern`。
- **`user_profiles.tracks_glycemic_concern` 欄位仍保留**：既有資料不因 UI 下架而自動變更；標示守衛 Edge Function 若仍讀取該布林，行為相容舊資料；新使用者預設維持 `FALSE`。

## 原因

產品側希望單一流向：以口述健康脈絡承載個人化留意事項（含糖分／血糖面向），不再維護獨立 toggle。

## 後續

已更新 `docs/06-pages.md` 對應列。可選：`label-guard` prompt 長期可依 `personal_context_facets` 加強高糖提示語意（與現有 `tracks_glycemic_concern` 並用或取代需另議）。
