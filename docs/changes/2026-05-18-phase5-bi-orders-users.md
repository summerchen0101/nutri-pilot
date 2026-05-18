# Phase 5（BI／訂單／User）對齊 03-features 實作

日期：2026-05-18

影響規格：`docs/03-features.md`、`docs/08-admin.md`

異動摘要：

- 新增 **`product_events` 表** 與 `get_daily_gmv`、`get_product_funnel` RPC；前台 **anon/authenticated INSERT** + staff SELECT（與 **08 「不需 RLS」** 作法不同——為符合 Phase 5 對埋點寫入之安全分界）。
- 商城 **列表 impression／詳情 click／加入購物車 add_to_cart** 與藍新 **Notify purchase** 埋點接線。
- `/admin/dashboard`：**本月 GMV／訂單數**、過去 **30 日 GMV** 折線、funnel、`purchase` **Top 10**、`cs` **仍轉訂單**，財務圖 **僅 super_admin**。
- 訂單狀態手動規則收斂（**禁止將 paid 回退為 pending**，出貨權 **`order.ship`**、退款標 **`order.refund` + canceled**）。
- **`admin_user_registered_at_for_staff` RPC + `admin-suspend-user`** Edge：`super_admin` 停用／解禁一般用戶（長期 ban_duration；**保護無法 ban 另一位 super_admin**）。

原因／後續：資料層與儀表板需先有表與 RPC 才能對齊 08 BI；請部署 **`041_product_events_and_bi_rpcs.sql`、`042_admin_user_registered_at_rpc.sql`** 與 **`admin-suspend-user`** Edge 後再在線上驗 funnel／GMV。若將訂閱／MRP 拉回範疇請另開 migration／規格段落。
