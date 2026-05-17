# 商品詳情與加購 Sheet：原價／特價與最低價預設規格

**日期**：2026-05-17  
**影響規格**：docs/02-schema.md（`list_price` 語意；結帳仍以 `price`）  
**類型**：修改

## 原規格／先前實作

商品詳情查詢未帶 `list_price`；頂部與 `ShopAddToCartSheet` 僅顯示單一售價。預設規格為「陣列中第一個可購買規格」，與目錄卡「以最低售價為主」體感不一致。

## 實際做法

1. 商品詳情 [`page.tsx`](src/app/(main)/shop/[productId]/page.tsx)：`product_variants` select 含 `list_price`。  
2. [`variant-stock.ts`](src/lib/shop/variant-stock.ts)：`getPreferredSelectableVariantId` — 可購規格中 **`price` 最低**；同價保留較早索引；全不可購時仍回傳 `variants[0]?.id`。  
3. [`catalog-card-price.ts`](src/lib/shop/catalog-card-price.ts)：`variantListStrikePrice` — 單一規格劃線原價（`list_price` 有效且大於 `price`）。  
4. [`product-detail-marais-client.tsx`](src/app/(main)/shop/[productId]/product-detail-marais-client.tsx)：初始 `variantId`、頂部價格（劃線原價＋主色特價、aria-label）、Sheet payload 帶 `list_price`。  
5. [`shop-add-to-cart-sheet.tsx`](src/app/(main)/shop/_components/shop-add-to-cart-sheet.tsx)：型別含 `list_price`、`firstSelectableId` 用上述 helper、標題區雙價顯示；**`unitPrice`／加購行仍為 `price`**。  
6. [`shop-quick-add-cart-dialog.tsx`](src/app/(main)/shop/_components/shop-quick-add-cart-dialog.tsx)：`variants` 型別補 `list_price`（與目錄列一致）。

## 原因

與目錄卡「優惠價／原價」語意對齊；預設突出最低可購售價，降低誤解。

## 後續

若需更新 docs/09-ui-design.md 中「商品詳情價格列」可再補一段；**無 DB 變更**。
