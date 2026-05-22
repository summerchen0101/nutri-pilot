# 廠商獨立商城頁

**日期**：2026-05-21

**影響規格**：docs/05-shop.md、docs/08-admin.md

**異動摘要**：

- 新增 `/shop/vendors/[slug]`：banner、logo、簡介、配送摘要與該廠商品列表。
- `vendors` 表新增 `description`、`banner_url`、`logo_url`（migration `051`）。
- 商品詳情「逛逛商城」改導向廠商頁；舊 `/shop?vendor_id=` 自動 redirect。
- 後台新增 `/admin/vendors` 列表與編輯（banner／logo 上傳、`vendor.write` 儲存）。

**原因／後續**：與單廠商結帳體驗一致；可回頭更新規格書商城頁面章節。
