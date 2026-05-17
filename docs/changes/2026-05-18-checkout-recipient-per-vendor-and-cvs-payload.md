# 結帳：運送卡片內收件／超商與 create-newebpay-payment 契約

**日期**：2026-05-18  
**影響規格**：[docs/05-shop.md](../../docs/05-shop.md)（購物車／結帳與運送）

## 異動摘要

- 移除獨立「收件資料」卡片；各廠商區塊依 `vendor_shipping_methods.code` 顯示宅配（姓名／電話／地址）或超商（姓名／電話／門市），並提供「編輯」（Bottom Sheet）與超商「重選」（另開分頁；`NEXT_PUBLIC_CVS_STORE_SELECT_URL` 未設時為 `about:blank` 並附說明）。
- `VendorShippingSummary` 新增 `selectedShippingMethodCode`；新增 `shipping-method-kind`、`cvs-store-select` 輔助模組。
- `startCheckout`／Edge `create-newebpay-payment` 接受 `cvsStoreNameByVendor`；驗證改為：姓名與電話必填；含宅配則地址必填；含超商則該廠 `cvsStoreNameByVendor[vendorId]` 必填；僅超商訂單允許 `recipient_address_full` 為空。`checkout_snapshot.vendors[]` 對超商附 `cvsStoreName`。`saveShippingToProfile` 僅在地址非空時更新地址相關欄位。

## 原因／後續

- 與多廠商、超商種子運送方式對齊；門市選擇 URL 待串物流／地圖 API。若需更新規格書結帳章節可補 `recipient`／snapshot 欄位說明。
