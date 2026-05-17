# 購物車：淺灰底、運送方式 Bottom Sheet、超取種子與預設最便宜運費

**日期**：2026-05-18  
**影響規格**：docs/05-shop.md（新增 `/shop/cart` 表格）  
**類型**：修改

## 原規格

- [docs/changes/2026-05-17-cart-vendor-shipping-and-checkout.md](2026-05-17-cart-vendor-shipping-and-checkout.md)：種子含 **`store_pickup`（門市自取）**；無效選擇時退回該廠 **`sort_order` 首位**；購物車運送以 **`SegmentedTabs`** 切換。

## 實際做法

1. **DB**（[`037_vendor_shipping_cvs_and_disable_pickup.sql`](../../supabase/migrations/037_vendor_shipping_cvs_and_disable_pickup.sql)）：`store_pickup` 設為 **`is_active = FALSE`**；每 vendor 種子 **`seven_eleven_pickup`**（7-11 取貨）、**`seven_eleven_cod`**（7-11 取貨付款）、**`family_mart_pickup`**（全家取貨），運費 **NT$ 60**、`sort_order` 2–4（宅配維持既有種子）。
2. **預設運送**：無選擇或選擇無效時，改為在目前該廠商品小計下 **`effectiveShippingForVendor` 最低** 之 method（平手依 `sort_order`、`code`）；[`create-newebpay-payment`](../../supabase/functions/create-newebpay-payment/index.ts) 在未帶 `method_id` 時使用相同規則。
3. **前台**：購物車 **整頁最外層**淺灰底（`bg-neutral-bg-secondary`）；[`CartVendorShippingPicker`](../../src/app/(main)/shop/cart/cart-vendor-shipping-picker.tsx) 改為可點列 + **`選擇運送方式`** Bottom Sheet，列出各方式與 **NT$（effective）**；固定結帳列頂端分隔線 **滿版寬**（見 [`cart-fixed-summary-bar.tsx`](../../src/app/(main)/shop/cart/cart-fixed-summary-bar.tsx)）。
4. **側欄購物車**：[`ShopRightSheet`](../../src/app/(main)/shop/_components/shop-right-sheet.tsx) `mutedBody` 標題列預設透明、無固定底線；列表捲動後 **`elevatedHeader`** 升起（與 **`StickyPageHeaderShell`** 同款）；標題 **`text-foreground`**；[`ShopCartPanel`](../../src/app/(main)/shop/_components/shop-cart-panel.tsx) 不外層水平 `px` 包住 [`CartView`](../../src/app/(main)/shop/cart/cart-view.tsx)，列表區 `px-4`、結帳條滿寬。
5. **程式過濾**：仍過濾內碼 **`store_pickup`**（防異常資料）。
6. **購物車頂欄（全頁）**：[`StickyPageHeaderShell`](../../src/components/layout/sticky-page-header-shell.tsx) 支援選填 **`scrollContainerRef`**（內層捲動時判定升起）；結帳進度列改為 **`StickyPageHeader` `afterHeader`**。

## 原因

移除門市自取、支援宅配與超商取貨；預設改為對使用者最省的運費，避免免運門檻與低運費並列時直覺不符。

## 後續

- 已於 [docs/05-shop.md](../05-shop.md) 增列 **`/shop/cart`** 簡短規格。
- 上線需套用 migration 並重新部署 **`create-newebpay-payment`**。
