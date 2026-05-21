# 付款回傳恢復 opener 導向

**日期**：2026-05-21

**影響規格**：`docs/05-shop.md`、`docs/07-api.md`、`docs/third/ecpay-payment-spec.md`

## 異動摘要

- OrderResultURL **改回** Edge `ecpay-order-result?appOrigin=`（含 CheckMac、postMessage、paymentDone 絕對 URL）；`ecpay-checkout` 不再指向 Next `/shop/payment-return`。
- 根因：`/shop/payment-return` 在 auth middleware 內，綠界跨站 POST 不帶 session → 302 `/login`，主視窗 URL 不變。
- `openPayment` 開啟付款後即 `pollOrderStatus`，ReturnURL 入帳後仍可導成功頁（不依賴 query）。
- Next `/shop/payment-return` 保留僅本機 GET 測試；文件修正 ReturnURL vs OrderResultURL 混淆。

## 原因／後續

- 同源 payment-return 方案因 SameSite + middleware 不可行；入帳仍以 ReturnURL（Edge）為準。
