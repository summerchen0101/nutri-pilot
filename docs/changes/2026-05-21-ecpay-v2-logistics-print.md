# 綠界 V2 托運單列印升級

**日期**：2026-05-21

**影響規格**：`docs/third/ecpay-logistics-spec.md`（Printing Support）、`docs/07-api.md`

## 異動摘要

- 後台「列印託運單」由 V1 form POST（MD5 CheckMac）改為 V2 `PrintTradeDocument`（AES JSON 信封）。
- 列印權限由僅 `super_admin` 擴大至具 `order.ship` 的 `cs`。
- 新增萊爾富（`HILIFEC2C`）等子類型列印支援；UI 依 `isLogisticsPrintSupported` 顯示按鈕。
- `CreateByTempTrade` 回傳優先寫入 `LogisticsID`，避免列印 ID 缺失。
- 列印改 `format=json` + popup `about:blank` + opener form POST（與結帳物流一致），避開 Supabase 託管 HTML sandbox 顯示原始碼／script 不執行；JWT 改 Authorization header，不再放 URL。

## 原因／後續

- V1 列印端點未涵蓋萊爾富；V2 統一 API 可一次支援多 subtype。
- 宅配（`TCAT`/`POST`）已列入支援清單，若 stage 實測失敗可從 UI 隱藏。
- 直接 `window.open` Edge HTML 會因 sandbox 失敗；後台僅走 JSON bridge。
