# 購物車：總計＋明細 Sheet 與捲動區塊（優惠／點數／加購）

**日期**：2026-05-17

**影響規格**：docs/05-shop.md

**類型**：新增 | 修改

## 原規格

[`docs/05-shop.md`](/docs/05-shop.md) 說明購物點與推薦分數等商業規則，但未規範購物車頁面 UI：底部總計展開方式、購物車內優惠／點數／加購區塊的呈現。

## 實際做法

1. **全頁購物車底欄**（[`cart-fixed-summary-bar.tsx`](../../src/app/(main)/shop/cart/cart-fixed-summary-bar.tsx)）：改為預設只顯示「訂單總計」摘要；使用者點「明細」開啟 Bottom Sheet（[`cart-totals-detail-sheet.tsx`](../../src/app/(main)/shop/cart/cart-totals-detail-sheet.tsx)）才顯示商品金額、運費、總計與新台幣說明，並附上「關閉」鈕。
2. **共用結帳底欄**：抽出 [`cart-checkout-dock.tsx`](../../src/app/(main)/shop/cart/cart-checkout-dock.tsx)，側欄購物車與全頁共用；側欄使用較精簡的出貨說明字串。
3. **捲動區塊**：在廠商與商品列之下新增 [`cart-commerce-sections.tsx`](../../src/app/(main)/shop/cart/cart-commerce-sections.tsx)：**優惠券與優惠碼**（進 Sheet／可轉設定）、**點數折抵**（顯示餘額與試用開關，**不累計入**目前 `grandTotal`，並附註說明）、**人氣商品・加購推薦**（一次性查詢商品與分數，橫滑；排除已在購物車內的商品；失敗時顯示提示）。
4. **視覺**：廠商區塊減少多層框線，配送說明改為淡綠區塊；全頁捲區加淺底與橫向內距（[`shop-cart-page-client.tsx`](../../src/app/(main)/shop/cart/shop-cart-page-client.tsx)）。依現行 UI 規範不依賴 `box-shadow` 做階層。

## 原因

對齊產品參考的資訊層級：底部先給總結金額、明細再展開；鼓勵在購車內發現優惠與延伸商品；點數與優惠核銷仍待後端，故僅先做介面與資料讀取、不調整結帳金額計算。

## 後續

- 優惠券核銷、點數折抵寫入結帳與訂單時，須接上 [`startCheckout`](../../src/app/(main)/shop/actions.ts)／Edge Function，並視需要更新總計顯示邏輯與規格書條列。
- 可視需要將購車加購與詳情／快速加購 Sheet 再行整合。
