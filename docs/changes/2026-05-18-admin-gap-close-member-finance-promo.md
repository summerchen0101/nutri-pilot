# 會員訂單／後台金流報表／優惠與購物點手調（對照缺口盤點）

**日期**：2026-05-18

**影響規格**：[docs/03-features.md](docs/03-features.md)（P6-3／P6-4 進度）、[docs/08-admin.md](docs/08-admin.md)、[docs/admin-gaps-2026-05-18.md](docs/admin-gaps-2026-05-18.md)、[docs/05-shop.md](docs/05-shop.md)

**異動摘要**

- 會員端：`/settings/orders` 接 `orders`／`sub_orders` 物流摘要；`/settings/coupons` 讀取 `promo_campaigns`（RLS 公開檔）。
- 後台：`/admin/finance/payments` 金流對帳列表＋CSV；`/admin/reports` 匯出銷售／產品明細 CSV；訂單詳情可編子訂單物流並寫稽核。
- Migration `045_promo_shop_points_admin.sql`：`promo_campaigns`／`promo_codes`／`promo_redemptions`、`admin_adjust_shop_points` RPC。
- 後台：`/admin/promotions`、`/admin/shop-points`；權限新增 `promo.manage`、`shop.points.adjust`；middleware 與側欄已掛路由。
- `docs/admin-gaps-2026-05-18.md` §3–5 與現行 BI／稽核一致化更新。

**原因／後續**：結帳自動套用優惠碼與 `promo_redemptions` 寫入仍待接單；部署後請執行 migration 並視需要 `supabase gen types` 與本機型別核對。
