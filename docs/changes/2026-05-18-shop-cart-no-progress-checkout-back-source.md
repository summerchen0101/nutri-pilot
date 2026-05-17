# 全頁購物車移除結帳進度列＋依來源還原結帳返回

**日期**：2026-05-18

**影響規格**：docs/05-shop.md § `/shop/cart` 版型表（原先寫頂欄含 `afterHeader` 進度列，與實作不一致）

**異動摘要**

- `/shop/cart`：[`ShopCartPageClient`](../../src/app/(main)/shop/cart/shop-cart-page-client.tsx) 不再渲染 [`CheckoutProgressSteps`](../../src/app/(main)/shop/cart/checkout-progress-steps.tsx)；結帳頁仍保留第二步進度列。
- [`cart-store`](../../src/lib/shop/cart-store.ts)：`checkoutEntrySource`（`'cart_page' | 'shop_panel'`）僅記憶體、`partialize` 不包含。
- [`CartCheckoutDock.goCheckout`](../../src/app/(main)/shop/cart/cart-checkout-dock.tsx)：關面板前寫入來源（側欄開啟為 `shop_panel`，否則 `cart_page`）。
- [`CheckoutClient.goBackToCart`](../../src/app/(main)/shop/checkout/checkout-client.tsx)：依來源 `router.push('/shop')`+`openCartPanel()` 或 `router.push('/shop/cart')`；無來源時 fallback `/shop/cart`。

**原因／後續**：返回應還原使用者進結帳前的介面（商城＋側欄 vs 全頁購物車）；購物車頁與側欄對齊、不再顯示三步驟。請將 docs/05-shop.md 該表格「頂欄＋進度列」改為僅 `StickyPageHeader`（無 `afterHeader` 進度列）。
