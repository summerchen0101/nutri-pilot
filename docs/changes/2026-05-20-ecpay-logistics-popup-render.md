# 物流 popup 改自有中繼頁

**日期**：2026-05-20

**影響規格**：`docs/05-shop.md`、`docs/third/ecpay-logistics-spec.md`

## 異動摘要

- `ecpay-logistics-selection` 不再原樣轉發綠界 HTML；改解析 form `action` + `d` 後以 `buildAutoSubmitFormHtml` 輸出 UTF-8 中繼頁（與 `ecpay-checkout` 一致）。
- 新增 `extractLogisticsAutoSubmitForm`、`parseLogisticsCallbackBody`（支援 V2 JSON／`d` 信封與 flat 回調）。
- `ecpay-logistics-client-return` 僅在取得有效 `TempLogisticsID` 且 `CreateByTempTrade` 成功時標記 `completed: true`。
- 移除對綠界 HTML 強插 `charset=utf-8`（避免 Big5 文案亂碼）。
- **結帳 popup**：`ecpay-logistics-selection`／`ecpay-checkout` 支援 `?format=json`；前端 `about:blank` + opener form POST，避開 Supabase 託管 HTML sandbox 阻擋 auto-submit script。
- **CORS**：結帳改由 Server Action（[`shop/actions.ts`](../src/app/(main)/shop/actions.ts)）伺服器端 fetch JSON，不再從瀏覽器直連 Edge；先取 payload 再開 popup，避免 fetch 失敗時視窗閃關。Edge HTML／405 回應一律帶 `corsHeaders`。
- **`format=json` 契約**：`ecpay-logistics-selection` 解析綠界 HTML 失敗時改回 `jsonResponse({ error })`，不再 fallback 原始 HTML；Server Action 先讀 `text` 判斷 JSON／HTML，避免 `Unexpected token '<'`。
- **物流回傳續結帳**：`ecpay-logistics-client-return` 改 `navigateOpener: false`（只關 popup）；`/shop?logisticsDone=1` 由 `ShopEcpayReturnHandler` + `resumeEcpayCheckout` 開結帳側欄並接續付款。
- **宅配 ClientReply**：新增 `resolveLogisticsClientReturnData` 解密 `ResultData` 內層 `Data`，以 `TempLogisticsID` + `RtnCode===1` 判定完成；HOME 寫入 `ReceiverAddress`。
- **popup 關閉輪詢**：`waitForVendorLogisticsCompleted`（15s／500ms）避免 client-return 尚未寫入 DB 即誤判「物流尚未完成」。
- **付款 popup 手勢**：物流完成後進 `paymentReady`，由結帳側欄「前往付款」按鈕觸發 `openPayment`（點擊時同步開 blank popup 再 fetch bridge）；`resumeEcpayCheckout` 不再於 `useEffect` 自動開付款視窗。
- **成功頁續接**：`ecpay-checkout-flow-store` 共用 phase；`logisticsDone` 改 `sessionStorage` + `CheckoutClient` 呼叫 `resumeEcpayCheckout`（修復 Handler／側欄雙 hook）。付款完成 `ecpay-order-result` 導向 `/shop?paymentDone=1`，`ShopEcpayReturnHandler` 查單後導 `/shop/success`；popup 回傳 HTML 加 opener 導向失敗時 fallback 同頁導向。
- **OrderResultURL 競態**：`waitForOrderPaid`（30s）輪詢 `paid`；`paymentDone` 不再單次查 DB；逾時且 `rtnCode=1` 仍導成功頁。`pollOrderStatus` 前 10 次 500ms；popup 被擋改 `/shop/payment-bridge` 同頁 POST 綠界。
- **paymentDone 被擋**：`ShopEcpayReturnHandler` 的 `handledRef` 在 `logisticsDone` 後未重置，導致付款回傳永不處理；改為依 action 簽名去重。`rtnCode=1` 立即導 `/shop/success`；`ecpay-order-result` 成功時直接導成功頁（非僅 `paymentDone` 中繼）。
- **付款回傳同源**：`ecpay-checkout` 的 `OrderResultURL` 改為請求 origin 的 `/shop/payment-return`（Server Action 傳 `appOrigin`）；POST 解析 `RtnCode`／`CustomField1` 後 302 至 `/shop/success`。
- **待付款繼續付款**：`settings/orders` 列表與詳情對 `pending` 且 `logisticsCompleted` 顯示「繼續付款」（`assertOrderPayable` + `openOrderPayment`）。
- 中繼／回傳 HTML 加手動「前往綠界」submit 與「返回商城」連結（列印託運單等直接開 URL 仍可用）。

## 原因／後續

- popup 曾顯示 HTML 原始碼而非渲染頁面。
- 託管網域載入 Edge HTML 時瀏覽器 sandbox 不執行 script；結帳改 JSON bridge + Server Action，不依賴 Edge 頁內 script 與瀏覽器 cross-origin fetch。
- 金流 callback 仍為 AIO V5 flat CheckMac；若日後為信封格式，Edge log 會 warn，再補解析。
