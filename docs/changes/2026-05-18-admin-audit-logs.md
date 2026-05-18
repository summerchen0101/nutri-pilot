# Admin 稽核：`admin_logs` 與 `admin_append_audit_log`

**日期**：2026-05-18

**影響規格**：`docs/08-admin.md`（DB 補充 `admin_logs`）、`docs/03-features.md` Phase 6 P6-2。

**異動摘要**

- 新增 migration `044_admin_logs.sql`：`admin_logs` 表、RLS（僅 `super_admin` 可 SELECT）、staff 僅透過 `SECURITY DEFINER` RPC `admin_append_audit_log(text,…)` 寫入；`authorized` INSERT 不提供直寫表。
- Next Server Actions（訂單狀態、商品建立／編修／封面／刪除、品牌、公告）於業務成功後呼叫 RPC；稽核失敗時 `console.error` 並不復原已成功之業務寫入。
- Edge `set-admin-role`、`admin-suspend-user` 於 Auth 異動成功後以呼叫者 Bearer 對同一 RPC 寫稽核。
- 新增 `/admin/settings/audit`（僅 super_admin）：分頁列表；側欄「系統」新增「稽核」連結。
- **`supabase ts`**：本機無法 `gen types` 時已在 `src/types/supabase.ts` 手動合併 `admin_logs` 與 RPC 簽章。

**原因／後續**

- 與 08 DDL 對齊但寫入改為統一 RPC，避免冒寫 `admin_id`。若將來需「業務失敗則不写稽核」已天然滿足；若需強一致雙寫請再評估 Postgres transaction／單一 RPC 包業務。
- 部署後請執行 migration 並 `supabase gen types` 確認型別與 hand-merge 無落差。
