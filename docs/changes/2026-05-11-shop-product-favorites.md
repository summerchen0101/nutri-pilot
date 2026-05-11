# 商城：我的最愛（收藏商品）

**日期**：2026-05-11  
**影響規格**：docs/05-shop.md  
**類型**：新增

## 原規格

- 商品詳情圖區規格寫「收藏按鈕（暫不實作）」。
- 無 `user_product_favorites` 表與 `/shop/favorites` 描述。

## 實際做法

- 新增表 `user_product_favorites`（`user_id`, `product_id`, `created_at`，PK 複合，RLS 僅本人）。
- Server Action `toggleProductFavorite`；商品頁 `PageHeader` 右上角與捲動後浮動區（購物車上方）愛心鈕共用 Zustand 同步狀態。
- 新增 `/shop/favorites` 列表（依收藏時間排序）；商城首頁頂欄增加進入列表之愛心連結。
- 商城首頁 `/shop` 捲動後浮動區亦顯示愛心（導向 `/shop/favorites`，與商品頁「切換收藏」區隔）。
- `src/types/supabase.ts` 已含 `user_product_favorites` 型別（部署 migration 後請再以 `supabase gen types` 校對）。

## 原因

使用者需要跨裝置持久收藏與集中瀏覽，優先於僅前端儲存。

## 後續

- 本地／遠端 DB 套用 `supabase/migrations/021_user_product_favorites.sql` 後執行型別產生。
- 規格書 `docs/05-shop.md` 已更新對應段落。
