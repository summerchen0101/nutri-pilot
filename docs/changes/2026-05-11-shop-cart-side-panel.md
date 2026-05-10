# 健康商城購物車改為右側滑入面板

**日期**：2026-05-11
**影響規格**：docs/05-shop.md、docs/06-pages.md
**類型**：修改

## 原規格

商城與商品流程透過獨立路由檢視購物車與結帳內容；規格未強制購物車須為全頁或側欄。

## 實際做法

- 在 [`src/lib/shop/cart-store.ts`](../../src/lib/shop/cart-store.ts) 新增 `isCartPanelOpen`、`openCartPanel`、`closeCartPanel`；`persist` 使用 `partialize` 僅持久化 `lines`，面板開關不寫入 localStorage。
- 新增 [`src/app/(main)/shop/layout.tsx`](../../src/app/(main)/shop/layout.tsx) 掛載 `ShopCartPanel`；右側滑入面板含標題「購物車」、關閉用 **X**、點遮罩關閉、內嵌既有 [`CartView`](../../src/app/(main)/shop/cart/cart-view.tsx)。
- [`ShopPageHeader`](../../src/app/(main)/shop/shop-page-header.tsx) 購物車圖示改為 client 按鈕 [`ShopCartHeaderAction`](../../src/app/(main)/shop/shop-cart-header-action.tsx) 呼叫 `openCartPanel`，不導向 `/shop/cart`。
- 商品詳情 [`ProductDetailClient`](../../src/app/(main)/shop/[productId]/product-detail-client.tsx) 於「加入購物車」後改為 `openCartPanel()`。
- **保留** [`/shop/cart`](../../src/app/(main)/shop/cart/page.tsx) 全頁（Stripe `cancel_url`、書籤／直連仍可用）。

## 原因

降低點購物車圖示時的換頁斷裂感，維持在商城脈絡內完成檢視與結帳前確認。

## 後續

- 若規格書需描述「預設為側欄購物車」，可更新 `docs/05-shop.md` 導覽與 CTA 段落。
- 可再補 Escape 關閉或 focus trap（未列為本次範圍）。
