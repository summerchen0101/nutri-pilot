# 商城頁首改為顯示購物金餘額

**日期**：2026-05-17  
**影響規格**：docs/09-ui-design.md（頁首／商城）  
**類型**：修改

## 原規格／先前實作

商城目錄頁中央為襯線品牌字標；商品詳情頁首中央為空白佔位。

## 實際做法

1. 新增 [`ShopHeaderPointsTitle`](src/app/(main)/shop/_components/shop-header-points-title.tsx)：`Coins` 圖示、「購物金」、餘額與「點」；可點連至 [`/settings/points`](src/app/(main)/settings/points/page.tsx)。  
2. [`ShopPageHeader`](src/app/(main)/shop/shop-page-header.tsx) 以餘額取代字標；`title`（`sr-only`）為「健康商城，購物金餘額 N 點」。  
3. [`shop/page.tsx`](src/app/(main)/shop/page.tsx) 查 `user_profiles.shop_points_balance` 並傳入。  
4. 商品詳情 [`[productId]/page.tsx`](src/app/(main)/shop/[productId]/page.tsx) 使用同一元件；無障礙標題含商品名與購物金餘額。  
5. 移除未再使用之 [`shop-header-brand-title`](src/app/(main)/shop/_components/shop-header-brand-title.tsx) 與 [`shop-header-constants`](src/lib/shop/shop-header-constants.ts)。

## 原因

列表／詳情統一露出購物金，與結帳折抵心智一致；字標改為可操作的點數入口。

## 後續

若需減少列表頁額外查詢，可將 `shop_points_balance` 納入 [`USER_PROFILE_CORE_SELECT`](src/lib/user-profile/cached-core-profile.ts)。
