# 後台商品拖曳排序與前台手動順序

**日期**：2026-05-20

**影響規格**：docs/08-admin.md、docs/05-shop.md

**異動摘要**：

- `products` 新增 `sort_order`（migration `046_products_sort_order.sql`），既有商品依 `created_at DESC` 回填。
- `/admin/products` 列表顯示縮圖，支援 HTML5 拖曳排序並寫入 `sort_order`。
- 前台商城預設「個人化推薦」排序改為僅依後台 `sort_order`（不再依 `user_product_scores`）；評分／價格排序仍可用，`sort_order` 為 tie-breaker。
- Dashboard 推薦軌、購物車加購推薦改依 `sort_order` 取前 N 筆。

**原因／後續**：營運需手動控制商品曝光順序；請套用 migration 後執行 `supabase gen types`。可回頭更新 `docs/05-shop.md` 排序說明。
