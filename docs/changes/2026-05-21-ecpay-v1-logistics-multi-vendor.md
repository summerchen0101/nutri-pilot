# 綠界物流 V1 多廠商結帳

**日期**：2026-05-21  
**影響規格**：[docs/05-shop.md](../05-shop.md)、[docs/third/ecpay-logistics-spec.md](../third/ecpay-logistics-spec.md)

## 異動摘要

- 物流由 V2（RedirectToLogisticsSelection + CreateByTempTrade）改 **V1**：`Express/map` 選店 → `Express/Create` 建單 → `QueryLogisticsTradeInfo/V5` 查詢。
- 每廠商一輪 queue 不變；`LogisticsSubType` 由購物車運送方式帶入，不再於綠界頁重選通路。
- **建單時機**：`seven_eleven_cod` 選店後立即 Create（`IsCollection=Y`）；其餘超商取貨與宅配於 **付款成功後** Create。
- `checkout_snapshot` 新增 `paymentTotal`（AIO 排除到付商品小計）；`LogisticsDraft` 新增 `merchantLogisticsTradeNo`、`storeSelected`、`logisticsCreated`。
- 新增 Edge `ecpay-logistics-map-return`；`ecpay-logistics-client-return` 改 410。
- 後台列印改回 V1 subtype 端點；貨態 webhook 支援付款前更新 snapshot。

## 原因／後續

- 多廠商需分開選物流與門市，V1 地圖 API 與文件一致。若需更新規格書流程圖可補 `docs/05-shop.md` 綠界章節。
