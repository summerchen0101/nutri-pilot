# 綠界門市地圖回傳改 postMessage 通知主視窗

**日期**：2026-05-21

**影響規格**：`docs/07-api.md`（`ecpay-logistics-map-return` 行為）

## 異動摘要

- `ecpay-logistics-map-return` 改 `navigateOpener: true` + `closePopup: true`，與付款回傳相同以 `postMessage` 導主視窗至 `/shop?logisticsDone=1`。
- `parseShopCheckoutReturnUrl` 納入 `logisticsDone=1`；Handler 不再 `router.replace('/shop')` 清掉 query。
- `openStoreMap` 於 popup 關閉或主視窗 focus 時 fallback 呼叫 `handleMapReturn`。

## 原因／後續

- 先前 `reusePopup` 僅改 popup 文案，主視窗無 URL／訊息更新，使用者見彈窗秒關、門市未帶回。
- 需重新部署 `ecpay-logistics-map-return` Edge；測試環境地圖仍為固定門市（[8795 注意事項 #7](https://developers.ecpay.com.tw/8795/)）。
- **2026-05-21 補**：付款誤用 `submitBridgeToNamedPopup` 觸發門市地圖 URL 檢查，金流 popup 無法開啟；改 `submitPaymentBridgeToNamedPopup`；`ecpay-checkout` 改 `recomputeLogisticsCompleted` 判斷可否付款。
