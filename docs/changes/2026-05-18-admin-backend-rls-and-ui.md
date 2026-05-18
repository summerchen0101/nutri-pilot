# 主後台 `/admin`：RLS、RPC、頁面與 set-admin-role Edge

**日期**：2026-05-18

**影響規格**：docs/08-admin.md（實作補齊；細節見下列）

**異動摘要**

- 新增 migration `040_admin_rls_and_storage.sql`：`current_admin_role()`、後台相關 RLS、`product-images` Storage bucket 與公開讀取、RPC `admin_orders_for_staff`、`admin_users_directory`、`admin_user_email_for_staff`。
- Next：`/admin/login` Magic Link（callback `next=/admin`）、側欄 shell、dashboard／products／brands／orders／users／settings 頁面；商品編輯含規格同步與封面圖上傳。
- `middleware.ts`：修正無權限時導向角色預設首頁（避免 `cs` 誤闖 dashboard 造成迴圈）；`/admin` 納入 matcher。
- Edge Function `set-admin-role`：僅 `super_admin` 可更新他人 `app_metadata.admin_role`。
- 腳本 `scripts/set-first-admin.mjs`：以 Service Role 將指定 email 設為第一位 `super_admin`。
- `Button` 導出 `buttonVisualClassName`，供 `<Link>` 使用相同視覺樣式（既有 Button 無 `asChild`）。

**原因／後續**

- 規格已定 JWT `admin_role` + RLS；先前仅有 Middleware，資料層無法操作 catalog／orders。
- 部署後請執行 migration、建立第一位 admin、並部署 `set-admin-role`；BI／product_events 仍可依 docs/08-admin.md 後補。
