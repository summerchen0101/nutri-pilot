# 購物車視覺、底欄與每廠商運送方式（DB＋結帳）

**日期**：2026-05-17
**影響規格**：docs/05-shop.md、docs/02-schema.md（若含 vendors／購車／結帳段落）
**類型**：新增 | 修改

## 原規格

- 前台購物車運費以 `vendors.shipping_fee`／`free_shipping_threshold` 單一費率推導。
- `create-newebpay-payment`／購車小計對應前述單一邏輯。

## 實際做法

### Schema／資料

- 新增資料表 **`vendor_shipping_methods`**（`vendor_id`、`code`、`label`、`shipping_fee`、`free_shipping_threshold`、`sort_order`、`is_active`，廠商內 `code` 唯一）。
- Migration 將既有 `vendors` 之費率與門檻種子為 **`home_delivery`（宅配）**，並為每 vendor 追加 **`store_pickup`（門市自取，0 元）**。
- **`vendors` 舊欄位**：保留以利相容與對照（主要計費以 `vendor_shipping_methods` 為準）。

### 前台／狀態

- Zustand 購物車 **`vendorShippingSelections`**（`vendor_id` → `method_id`），persist 並含 migrate；載入選項不可用時退回該廠排序後之首個啟用方式。
- `useVendorShippingMethodsMap` 以 **單次** `.in('vendor_id', …)` 查詢（無 N+1）。
- **`calcVendorShippingSummaries`**／合計運費改依 **使用者選取之 method**（與門檻免運公式同既有語意）。
- 購物車：**捲區淺灰底**、各廠 **品項白卡／配送運費白卡**、`commerce-sections` 區塊白卡。
- **`CartCheckoutDock`**：移除深色出貨天數條與「繼續購物」。
- **`CartLineRow`**：不顯示「商品編號」。

### 結帳與 Edge

- **`startCheckout`** body 附加 **`vendorShippingSelections`**。
- **`create-newebpay-payment`**：依 body 對每廠 **`method_id` 驗證**（屬該廠、`is_active`），**僅依 DB method 重新計運費**；將所選運送方式寫入 **`checkout_snapshot` vendors**（如 `shippingMethodId`／`shippingMethodLabel`／`shippingMethodCode`）。
- **`checkout-client`**：明細區顯示各廠所選運送（唯讀），送出時沿用 store 中的 mapping。

## 原因

支援 **每廠多種運送方式**且金額以 **資料庫為準**，避免前台偽填運費；版型與底欄與計畫裁切一致。

## 後續

- 建議將 `vendor_shipping_methods` 與運送標籤寫入規格書 `docs/02-schema.md`／`docs/05-shop.md` 之購車與結帳章節（若段落仍為單一 `vendors.shipping_fee`）。
- 與 **`2026-05-11-shop-cart-side-panel.md`**、`2026-05-11-multi-vendor-sub-orders-shop-checkout.md`：**前次為側欄購車與子訂單快照**；本次在該模型上追加 **運送選項資料表**、前台選擇與 Edge **依 method 重算**。
- **`newebpay-notify`**／`sub_orders` 是否要持久化 **`shipping_carrier` 或 code** 可視營運需求擴充（目前快照已附 method 資訊）。
