# 紀錄頁拍照上傳區對齊守衛頁

**日期**：2026-05-20
**影響規格**：docs/09-ui-design.md、docs/06-pages.md（/log 拍照）

## 異動摘要

- `/log` 拍照辨識空狀態上傳區由綠底填滿改為 outline 虛線主色（與 `/guard` 一致），文案統一「拍攝或選擇相片」
- 分析中 loading 由多格 skeleton 簡化為單條 pulse +「AI 辨識中…」
- `/log` 與 `/guard` 預覽圖統一 `h-48 object-cover`

## 原因／後續

守衛頁已採主色 outline 上傳區；紀錄頁沿用 2026-05-10 綠底填滿版造成兩頁不一致。無需改 Queue 或 API。
