# 修改：購物點餘額禁止負數

## 日期

2026-05-18

## 影響規格

- [docs/05-shop.md](../05-shop.md)。

## 異動摘要

- 新增 migration `039_user_profiles_shop_points_balance_non_negative.sql`：`user_profiles.shop_points_balance` 套用 `CHECK (>= 0)`；套用前將既有負值列改為 **0**（資料修補，避免 migration 無法套用）。
- [docs/05-shop.md](../05-shop.md)：購物點段落補一句餘額不得為負與對應 migration 名稱。

## 原因／後續

開發種子／還原錯扣可能產生負餘額且 UI 會如實顯示；資料庫層阻擋寫入負值。業務上不應出現拆帳逆差時請改由後端調整 ledger／lots／餘額一致化；若仍需「對帳用負號」請另開規格討論。
