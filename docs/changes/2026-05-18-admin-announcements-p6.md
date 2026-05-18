# 公告後台 P6-1／RLS／權限

日期：2026-05-18

影響規格：`docs/03-features.md` Phase 6 P6-1、`docs/08-admin.md`（08 未定 cs 可否編輯公告）

異動摘要：

- 後台 **`/admin/announcements`**（列表、新增、編輯、刪除）；導覽：`super_admin`、`editor`。**`cs` 無進入／編輯**（middleware + `staffCan`，與 03 roadmap 對齊；若要比照客服發布需另規格）。
- **RLS**：`announcements` 新增 staff `SELECT`／`INSERT`／`UPDATE`（`super_admin`、`editor`）與 `DELETE`（僅 **`super_admin`**）；前台既有「已發布可見」政策不變，多 policy 對 `authenticated` 為 OR。
- 權限鍵：`announcement.manage`、`announcement.delete`。

原因／後續：`cs` 是否應有可見或唯讀清單可再開議題；請部署 **`043_staff_announcements_rls.sql`**。
