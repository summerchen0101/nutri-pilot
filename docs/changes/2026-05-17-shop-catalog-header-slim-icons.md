# 商城列表頁首精簡圖示

**日期**：2026-05-17  
**影響規格**：docs/09-ui-design.md（頁首輔助動作）  
**類型**：修改

## 原規格／先前實作

商城目錄頁首右欄含搜尋、分享、分類、篩選、收藏、購物車等圖示。

## 實際做法

列表頁 [`ShopPageHeader`](src/app/(main)/shop/shop-page-header.tsx) 僅保留 **搜尋、篩選、購物車**；**分類、分享、收藏**自頁首移除。分類改由商城底部選單「分類」開啟；[`ShopCatalogHeaderActions`](src/app/(main)/shop/shop-catalog-header-actions.tsx) 僅剩篩選鈕（含角標）。

## 原因

降低頁首擁擠，與底部導覽分工（分類歸底欄）。

## 後續

若規格書需明寫「商城目錄頁首不含分類／分享／收藏」，可回寫 docs/09。
