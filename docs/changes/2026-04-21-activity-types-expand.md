# 運動類型擴充（健身／瑜珈常用）

**日期**：2026-04-21  
**影響規格**：docs/02-schema.md  
**類型**：修改  

## 原規格

`activity_logs.activity_type` 僅允許 `walk` / `run` / `strength` / `yoga` / `cardio` / `other`（見 migration `014`）。

## 實際做法

- migration `015_activity_expand_types.sql`：CHECK 擴充，新增 `pilates`、`stretching`、`hiit`、`cycling`、`swimming`、`dance`。
- 應用層 `ACTIVITY_TYPES`、`KCAL_PER_MINUTE`、紀錄頁 `TYPE_LABEL` / `TYPE_ORDER` 與之一致；表單 chip 順序依有氧→重訓→瑜珈周邊→其他略作分組。

## 原因

產品需求：補足健身、瑜珈、皮拉提斯、單車、游泳、舞蹈等常見紀錄選項；估熱仍為介面參考非醫療建議。

## 後續

已更新 `docs/02-schema.md` 補充段之 `activity_type` 列舉。部署需執行 `015` migration。
