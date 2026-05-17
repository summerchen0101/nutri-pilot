# 商城目錄商品卡改為價格列＋簡易圖示 CTA

**日期**：2026-05-17  
**影響規格**：docs/09-ui-design.md（目錄列表卡片互動）  
**類型**：修改

## 原規格／先前實作

目錄商品卡底部為「購買」主按鈕（Shadow Grey）與收藏鈕；價格與內文同包在進入詳情的 `Link` 內，價格字色為一般前景色。

## 實際做法

1. [`shop-catalog-product-card`](src/app/(main)/shop/shop-catalog-product-card.tsx)：`Link` 僅包住圖片、品牌、品名。  
2. 下方獨立一列：`justify-between`，左為價格（`Link` 至同一詳情路徑）、右為**愛心 → 購物車**兩顆原生 `button`（無外框與底色，`strokeWidth={1.5}`，觸控區 `h-9 w-9`）。  
3. 價格強調：`text-red-900`＋`dark:text-red-300`。  
4. 已收藏維持 `Heart` `fill-current text-primary`；購物車仍呼叫既有 `onQuickAdd`。

## 原因

對齊電商常見「價格＋極簡圖示」列表風格，減少視覺上整排按鈕塊，與參考稿一致。

## 後續

若要在 `docs/09-ui-design.md` 補「目錄卡」專節（價格色、圖示操作），可併入本次異動敘述。
