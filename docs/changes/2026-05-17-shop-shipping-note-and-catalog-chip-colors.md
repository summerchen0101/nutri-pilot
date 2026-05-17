# 商城：運送備註綠色系、目錄分類 chip 黑底白字

**日期**：2026-05-17
**影響規格**：docs/09-ui-design.md
**類型**：修改

## 原規格

`docs/09-ui-design.md` 已定義 Sea Green 主色淡底（成功／資訊氛圍）與 Shadow Grey（Primary CTA）；商城目錄卡片分類 chip 先前依 change 紀錄改為 `bg-primary-light` + 深綠字。加購物車 Sheet 的運送說明區曾使用 Steel（藍灰）面板與字色。

## 實際做法

1. [`src/app/(main)/shop/_components/shop-add-to-cart-sheet.tsx`](../src/app/(main)/shop/_components/shop-add-to-cart-sheet.tsx)：`shippingNote` 區塊改為 `border-primary/25`、`bg-primary-light`、`text-primary-foreground`，`Truck` 圖示同色，不再使用 `--steel-*`。
2. [`src/app/(main)/shop/shop-catalog-product-card.tsx`](../src/app/(main)/shop/shop-catalog-product-card.tsx)：圖上分類 `span` 改為 `bg-shadow-grey`、`text-white/95`。

## 原因

商品詳情流程中的運送說明應與主題綠／成功語意一致；列表圖上分類需改為黑底白字以提升在商品圖上的可讀性與對比。

## 後續

若要在 `docs/09-ui-design.md` 逐條描述「商城目錄圖片角標」可補一句 Shadow Grey chip；與 [`2026-05-17-shop-catalog-product-card-ui-tokens.md`](2026-05-17-shop-catalog-product-card-ui-tokens.md) 中分類 chip 為淡綠底之敘述並存時，以本檔為準。
