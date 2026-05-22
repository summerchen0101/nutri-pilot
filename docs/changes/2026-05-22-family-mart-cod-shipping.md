# 全家取貨付款運送方式

**日期**：2026-05-22
**影響規格**：docs/third/ecpay-logistics-spec.md（間接）
**異動摘要**：
- 每廠商新增 `family_mart_cod`（全家取貨付款），運費與 7-11 取貨付款相同；綠界 subtype `FAMIC2C`、`IsCollection=Y` 流程同 `seven_eleven_cod`。
- `isCvsCodShippingCode` 涵蓋兩種 COD code；訂單顯示依 code 區分標籤。
**原因／後續**：補齊全家到店支付選項；規格書可補列 `family_mart_cod` 建單時機。
