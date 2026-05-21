# 綠界物流 V1 CheckMac 算法修正

**日期**：2026-05-21

**影響規格**：`docs/third/ecpay-integration-handbook.md`（技術備註）

## 異動摘要

- `generateEcpayLogisticsCheckMacValue` 補上官方步驟：URL encode 後 **toLowerCase** 再 MD5，修正 `Express/map` 被拒後導向 `/Express/v2/LogisticsSelection` 的問題。
- `ecpay-logistics-selection` 增加 CheckMac 自驗、`bridgeVersion: v1-map`；前端 `assertCvsMapBridgeAction` 拒絕 v2 action。

## 原因／後續

- 先前僅在 selection 附加 CheckMac，但算法與 [綠界文件 7424](https://developers.ecpay.com.tw/7424/) 不符。部署 Edge 後再測 stage／正式地圖。
