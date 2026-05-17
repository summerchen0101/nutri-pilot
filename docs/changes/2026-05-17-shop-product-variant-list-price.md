# 商品規格 list_price 與目錄卡優惠價顯示

**日期**：2026-05-17  
**影響規格**：docs/02-schema.md、docs/09-ui-design.md（商城目錄卡）  
**類型**：新增／修改

## 原規格／先前實作

`product_variants` 僅有 **`price`**（結帳與列表售價）；目錄卡單列價格＋圖示，無劃線原價。

## 實際做法

1. **Migration** [`033_product_variants_list_price.sql`](supabase/migrations/033_product_variants_list_price.sql)：新增可選 `list_price NUMERIC(8,2)`；**非 NULL 且大於 `price`** 時，前端可顯示灰色劃線原價，**結帳仍以 `price` 為準**（Edge／訂單邏輯不變）。  
2. [`docs/02-schema.md`](docs/02-schema.md) 與 [`src/types/supabase.ts`](src/types/supabase.ts) 同步欄位說明與型別。  
3. 目錄與收藏 [`shop-catalog-body.tsx`](src/app/(main)/shop/shop-catalog-body.tsx)、[`favorites/page.tsx`](src/app/(main)/shop/favorites/page.tsx) 查詢帶 `list_price`；收藏頁 `brand` 改與目錄相同之 `vendor:vendors!inner`。  
4. 共用映射 [`map-shop-product-row.ts`](src/app/(main)/shop/map-shop-product-row.ts)；[`ShopProductRow.variants`](src/app/(main)/shop/shop-home-client.tsx) 含 `list_price`。  
5. [`catalog-card-price.ts`](src/lib/shop/catalog-card-price.ts) 依「最低售價規格列」計算劃線金額；[`shop-catalog-product-card.tsx`](src/app/(main)/shop/shop-catalog-product-card.tsx) 改**兩行**（價格列含 `$`、可選劃線＋`text-heading-section` 優惠價；次列右對齊圖示、`strokeWidth={2}`）。

## 原因

支援電商常見「原價／優惠價」展示，並與先前目錄卡 UX 計畫（兩行排版、較大字級）一致。

## 後續

- 部署後執行 migration，並以 `supabase gen types`（或專案流程）確認型別。  
- 種子／後台若有維護規格表單，可選擇性補 `list_price` 編輯。  
- 商品詳情頁若需相同劃線邏輯可另開任務。
