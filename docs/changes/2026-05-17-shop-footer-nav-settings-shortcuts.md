# 商城專用底部導覽、移除 FAB、設定購物捷徑

**日期**：2026-05-17  
**影響規格**：docs/09-ui-design.md（底部主選單／浮動輔助）  
**類型**：修改

## 原規格

- 全站共用底部五欄主選單（總覽／守衛／紀錄／商城／我的），商城子頁與其他主功能區視覺一致。  
- 商城可輔以浮動按鈕強化購物車／收藏入口（見既有 cart scroll fab 相關變更紀錄）。

## 實際做法

1. **`/shop` 樹使用專用底部選單**：[`MainAppShell`](src/components/layout/main-app-shell.tsx) 在 `pathname` 為 `/shop` 或 `/shop/...` 時渲染 [`ShopBottomNav`](src/components/layout/shop-bottom-nav.tsx)（首頁、分類開面板、收藏、瀏覽歷史、前往設定）；其餘路由仍用 [`BottomNav`](src/components/layout/bottom-nav.tsx)。商品詳情頁亦顯示商城底欄。  
2. **固定路由**：[`SHOP_FIXED_ROUTE_SEGMENTS`](src/lib/shop/shop-path.ts) 新增 `history`；新增 `isShopRoutePathname`。  
3. **移除商城浮動購物車與浮動最愛**：刪除 [`shop-cart-scroll-fab`](src/app/(main)/shop/_components/shop-cart-scroll-fab.tsx)，[`shop/layout.tsx`](src/app/(main)/shop/layout.tsx) 不再掛載；移除 [`ShopFavoritesListFabLink`](src/app/(main)/shop/_components/product-favorite-controls.tsx)。  
4. **商品詳情頁首**：僅返回、可視中欄留白（螢幕閱讀仍讀商品名）、右側保留分享與購物車。  
5. **瀏覽歷史**：新增占位頁 [`/shop/history`](src/app/(main)/shop/history/page.tsx)。  
6. **設定**：「商城與點數」內新增 [`ShopCommerceShortcutsCard`](src/app/(main)/settings/_components/shop-commerce-shortcuts-card.tsx)（我的訂單、常用地址、購物金、優惠券）及 placeholder 頁 [`/settings/orders`](src/app/(main)/settings/orders/page.tsx)、[`/settings/coupons`](src/app/(main)/settings/coupons/page.tsx)。

## 原因

商城流程以專用底欄集中導覽，降低與飲食主流程底欄混淆；移除 FAB 避免與 sticky 頁首、底欄重疊；訂單／優惠券尚未有完整後台，先以占位頁與捷徑銜接。

## 後續

若瀏覽歷史、訂單列表、折價券後端就緒，替換占位頁並更新 docs/09 底部導覽章節（商城專用欄位）。
