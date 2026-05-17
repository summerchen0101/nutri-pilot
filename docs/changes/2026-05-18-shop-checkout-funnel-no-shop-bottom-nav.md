# 購物車／結帳／成功頁：隱藏商城底欄與結帳頁版型對齊

**日期**：2026-05-18

**影響規格**：docs/05-shop.md（`/shop/cart` 版型）；若書內仍寫「多數 shop 子頁共用商城底欄」，請補列本漏斗三頁除外。

**異動摘要**

- `src/lib/shop/shop-path.ts`：新增 `normalizeShopPathname`、`isShopCheckoutFunnelPathname`（`/shop/cart`、`/shop/checkout`、`/shop/success`）；`shouldHideAllBottomNavPathname` 於上述路徑亦為 true。
- `src/components/layout/main-app-shell.tsx`：商品詳情與結帳漏斗共用 **`pb-8`** 內容區底部留白（無底欄時不再沿用 `pb-24`／`pb-28`）。
- `src/app/(main)/shop/cart/cart-fixed-summary-bar.tsx`：固定結帳列改為 `fixed inset-x-0 bottom-0`（不再為商城底欄預留 4.5rem）；`CartCheckoutDock` 內既有 safe-area padding 不變。
- `src/app/(main)/shop/cart/shop-cart-page-client.tsx`：捲動區底部 padding 由 11rem 調降為 8rem（配合固定列下移）。
- `src/app/(main)/shop/checkout/checkout-client.tsx`：與購物車全頁一致之 **`bg-neutral-bg-secondary`**、sticky header + **`CheckoutProgressSteps` step 2**、可分離捲動區與 **`scrollContainerRef`**；運費說明移至捲動區頂；返回圖示改 **`FiChevronLeft`**。

**原因／後續**：結帳流程需專注版面、與購物車視覺一致；底欄隱藏後須同步修正固定列錨點。若需更新規格書，於商城導覽一節註明漏斗頁不顯示 `ShopBottomNav`。
