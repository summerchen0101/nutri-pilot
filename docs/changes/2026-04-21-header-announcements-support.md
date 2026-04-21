# 總覽／設定右上角圖示與公告資料表

**日期**：2026-04-21  
**影響規格**：docs/02-schema.md（精簡 MVP）、docs 未單獨記載之 App 導覽  
**類型**：新增

## 原規格

精簡 MVP schema 未包含站台公告表；總覽／設定頁無右上角公告鈴鐺、客服入口與設定頁登出捷徑。

## 實際做法

- 新增 `announcements`、`user_announcement_reads`（RLS：使用者僅可讀符合 `is_active` 且 `published_at <= now()` 之公告；已讀表僅限本人資料列）。
- 總覽頁 `PageHeader` 右側為公告（有未讀時顯示提示點）與客服連結；進入 `/announcements` 時批次寫入已讀。
- 新增 `/announcements` 列表頁、`/support` 占位頁。
- 設定頁 `PageHeader` 右側為登出圖示（沿用既有 `signOut`）。

## 原因

依產品需求提供公告未讀提示與客服／登出捷徑；公告內容由後台於 Supabase 維護。

## 後續

若要改為「逐則公告已讀」或推播管理，可再拆閱讀詳情頁與管理後台並更新 docs/03-features.md。
