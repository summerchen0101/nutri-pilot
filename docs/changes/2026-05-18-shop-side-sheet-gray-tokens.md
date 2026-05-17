# 商城購物車／結帳側欄淺灰 token

**日期**：2026-05-18

**影響規格**：[docs/09-ui-design.md](docs/09-ui-design.md)（補充實作層 token，未改寫主表色彩章節）

**異動摘要**

- 在 [`src/app/globals.css`](../../src/app/globals.css) 新增不透明 **`--shop-sheet-canvas`**（`#f2f2f2`）、**`--shop-field-surface`**（`#f5f5f5`），供購物車／結帳 funnel 與半透明 `bg-secondary`／`bg-muted` 分離。
- [`ShopRightSheet`](../../src/app/(main)/shop/_components/shop-right-sheet.tsx) `mutedBody` 改為 canvas；結帳表單與次區塊改 `shop-field-surface`。
- 購物車內 [`cart-vendor-shipping-picker`](../../src/app/(main)/shop/cart/cart-vendor-shipping-picker.tsx)、[`cart-line-row`](../../src/app/(main)/shop/cart/cart-line-row.tsx)、[`cart-commerce-sections`](../../src/app/(main)/shop/cart/cart-commerce-sections.tsx) 同款 field 底與 hover，對齊示意圖中性淺灰。

**原因／後續**

- 統一側欄灰底與白卡內欄位灰，避免 hsl 叠透明發色偏綠；全站其他頁仍用既有 `--color-background-secondary` 等，不受影響。
