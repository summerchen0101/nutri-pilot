# 商城頁首購物金改為金幣圖示＋數字

**日期**：2026-05-16  
**影響規格**：docs/changes/2026-05-17-shop-header-points-balance.md（先前敘述）、docs/09-ui-design.md（若有頁首輔助文案描述）  
**類型**：修改

## 原規格／先前做法

[`ShopHeaderPointsTitle`](src/app/(main)/shop/_components/shop-header-points-title.tsx) 以「購物金」文字、餘額數字與「元」呈現。

## 實際做法

改為 **`Coins`（金幣）圖示 + 本地化數字**；連結設 **`aria-label`**（購物金餘額 N 元、前往點數紀錄）。商品詳情頁無障礙標題中之單位由「點」改為「元」，與畫面一致。

## 原因

縮短頁首橫向空間、與右側 icon 列視覺語言一致。

## 後續

若 `docs/09-ui-design.md` 曾描述頁首購物金字串，可改寫為「圖示 + 數字」。
