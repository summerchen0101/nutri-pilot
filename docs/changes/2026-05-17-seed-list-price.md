# 種子商品規格補 list_price（特價展示）

**日期**：2026-05-17  
**影響規格**：docs/02-schema.md（種子資料；`list_price` 欄位見 migration 033）  
**類型**：修改

## 原規格／先前實作

`008_shop_seed_catalog` 寫入的 `product_variants` 僅有 `price`，無 `list_price`；且 008 早於 `list_price` 欄位 migration，不宜回頭改 INSERT。

## 實際做法

新增 [`034_seed_product_variants_list_price.sql`](supabase/migrations/034_seed_product_variants_list_price.sql)，對五筆已知種子 variant UUID 執行 `UPDATE`，使 `list_price > price`，便於目錄卡劃線原價與 `catalogListStrikePrice` 邏輯驗證（含最低價規格：`c1000001` 隨手包等）。

## 原因

本機／測試環境可立即看到「原價／優促價」UI，無需手動改 DB。

## 後續

部署時一佊套用 033、034；若種子 UUID 與 008 不一致則 UPDATE 不命中，可忽略或改以實際 id 補一則 migration。
