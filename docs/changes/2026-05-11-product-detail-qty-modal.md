# 商品詳情：購買數量改為彈窗選擇

**日期**：2026-05-11
**影響規格**：docs/05-shop.md
**類型**：修改

## 原規格

- 數量選擇：頁面上以加減按鈕操作。
- 價格顯示：單次售價。

## 實際做法

- 詳情頁移除頁內數量加減；僅保留規格 pill 與單次售價。
- 點「加入購物車」或「立即結帳」後開啟置中彈窗，於彈窗內選數量，並顯示小計；可取消、加入購物車（開側欄購物車）或立即結帳（導向結帳）。
- 商城列表既有 quick-add 彈窗改為共用 `ShopQuantityStepper`，並以 `variant-stock` 限制有庫存時「+」之上限。

## 原因

降低詳情頁主畫面操作項；數量決策與加入購物車／結帳同一步驟完成，與列表 quick-add 體驗一致。

## 後續

規格書已同步更新；`ProductDetailClient` 以 `key={product.id}` 掛載於 [`/shop/[productId]/page.tsx`](src/app/(main)/shop/[productId]/page.tsx) 以便換商品時重設選中規格。

---

**同日補充（UI）**：`ShopQuickAddCartDialog`、`ShopProductDetailPurchaseDialog` 改為底欄 sheet 排版：頂部 grabber、列表 quick-add 在上區保留規格 pill、其下橫向小圖＋品名／單價、分隔線、底列左數量右主按鈕「加入購物車」（Primary CTA 用 `Button` default）；詳情彈窗另於下方以次要樣式呈現「立即結帳」。關閉以遮罩與 grabber 為主，移除並列「取消」鈕。
