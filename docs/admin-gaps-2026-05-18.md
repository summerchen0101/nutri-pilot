# Admin 功能缺口盤點（對照 08 與前台）

**日期**：2026-05-18  
**目的**：對照 [docs/08-admin.md](08-admin.md) 與目前 `src/app/admin/*` 實作、前台頁面與 schema，區分「缺整頁／缺模組」與「路由已有但深度不足」，並標註 08 未列但產品已連 DB 的建議後台。

---

## 1. 規格與程式依據

| 來源 | 路徑 |
|------|------|
| 主後台規格 | [docs/08-admin.md](08-admin.md) |
| 前台頁面規格 | [docs/06-pages.md](06-pages.md) |
| Admin 路由實作 | `src/app/admin/**/page.tsx` |
| DB 型別 | `src/types/supabase.ts` |
| migrations | `supabase/migrations/` |

**說明**：`/dashboard`、`/log`、`/guard`、`/analytics` 等為**用戶端功能**；[08-admin.md](08-admin.md) 不要求為每一前台路由各做一個後台「鏡像頁」，而是透過 **BI 儀表板聚合**（訂單、用戶、商品數據等）支援營運。本文件仍列出與**資料營運**直接相關、但後台尚未覆蓋的模組。

---

## 2. `/admin/*` 路由對照（對 [08-admin.md § 路由結構](08-admin.md#路由結構)）

| 08 路徑 | 實作檔案 | 狀態 |
|---------|----------|------|
| `/admin/login` | [src/app/admin/login/page.tsx](../src/app/admin/login/page.tsx) | 已有 |
| `/admin/dashboard` | [src/app/admin/dashboard/page.tsx](../src/app/admin/dashboard/page.tsx) | **已對齊 Phase 5**：本月 GMV／訂單數、`get_daily_gmv` 折線圖、商品漏斗／熱門品（見 §3） |
| `/admin/products` | [src/app/admin/products/page.tsx](../src/app/admin/products/page.tsx) | 已有 |
| `/admin/products/new` | [src/app/admin/products/new/page.tsx](../src/app/admin/products/new/page.tsx) | 已有 |
| `/admin/products/[id]` | [src/app/admin/products/[id]/page.tsx](../src/app/admin/products/[id]/page.tsx) | 已有 |
| `/admin/brands` | [src/app/admin/brands/page.tsx](../src/app/admin/brands/page.tsx) | 已有 |
| `/admin/brands/new` | [src/app/admin/brands/new/page.tsx](../src/app/admin/brands/new/page.tsx) | 已有 |
| `/admin/brands/[id]` | [src/app/admin/brands/[id]/page.tsx](../src/app/admin/brands/[id]/page.tsx) | 已有 |
| `/admin/orders` | [src/app/admin/orders/page.tsx](../src/app/admin/orders/page.tsx) | 已有 |
| `/admin/orders/[id]` | [src/app/admin/orders/[id]/page.tsx](../src/app/admin/orders/[id]/page.tsx) | **部分**：狀態規則／退款占位已有；物流編輯／金流對帳另見 §6 擴充路由 |
| `/admin/users` | [src/app/admin/users/page.tsx](../src/app/admin/users/page.tsx) | 已有 |
| `/admin/users/[id]` | [src/app/admin/users/[id]/page.tsx](../src/app/admin/users/[id]/page.tsx) | **大致完成**：註冊日 RPC、`super_admin` 停用／解禁（見 §3） |
| `/admin/settings` | [src/app/admin/settings/page.tsx](../src/app/admin/settings/page.tsx) | 大致對齊（角色管理） |

**結論**：08 列出的路由**骨架已齊**；Phase 5 已補 **BI 資料層與儀表板**；剩餘主要在 **會員端訂單鏡像**、**物流／金流報表模組**、**折價／點數營運工具**（見 §6）。

---

## 3. 區塊級缺口（同一路由下未完成功能）

對照 [08-admin.md § BI 儀表板](08-admin.md#bi-儀表板)、[§ 訂單管理](08-admin.md#訂單管理)、[§ 用戶管理](08-admin.md#用戶管理)。

| 區域 | 08 要點 | 現況 |
|------|---------|------|
| **Dashboard** | 核心指標（**本月** GMV、訂單數等）、**30 天**銷售趨勢圖、用戶行為摘要、**商品轉換漏斗**、熱門商品 Top 10、訂閱／MRR（可略） | **已實作**：本月 paid GMV／訂單數、過去 N 日 `get_daily_gmv` 圖表、漏斗 RPC + Top 10（[`dashboard/page.tsx`](../src/app/admin/dashboard/page.tsx)）。訂閱／MRR 仍可標 MVP 略過。`cs` 導向訂單。 |
| **BI 前置** | `product_events` + `get_daily_gmv` + `get_product_funnel` | **已實作**：[`041_product_events_and_bi_rpcs.sql`](../supabase/migrations/041_product_events_and_bi_rpcs.sql)；前台／Notify 埋點見 [`src/lib/analytics/track.ts`](../src/lib/analytics/track.ts)。 |
| **訂單詳情** | 狀態流、退款占位 | [`order-status-rules.ts`](../src/app/admin/orders/order-status-rules.ts) + [`OrderStatusUpdater`](../src/app/admin/orders/_components/order-status-updater.tsx) 限制轉移；[`OrderRefundPlaceholderCard`](../src/app/admin/orders/_components/order-refund-placeholder-card.tsx) 占位。**物流欄位編輯**、**金流對帳列表**為後續擴充（見 §6）。 |
| **用戶詳情** | 註冊日、停用 | **已接**：註冊日 staff RPC、[`AdminUserSuspendPanel`](../src/app/admin/users/_components/admin-user-suspend-panel.tsx)。 |
| **Settings** | 角色管理（Phase） | [AdminSetRoleForm](../src/app/admin/settings/_components/admin-set-role-form.tsx) 等已存在；需依部署清單維護 Edge `set-admin-role` 與第一位 admin 流程（見 [docs/changes/2026-05-18-admin-backend-rls-and-ui.md](changes/2026-05-18-admin-backend-rls-and-ui.md)）。 |

---

## 4. Schema／RPC 與 [08-admin.md § DB 補充](08-admin.md#db-補充後台需要的額外資料表)

| 項目 | 08 描述 | 專案現況 |
|------|---------|----------|
| `product_events` | BI 漏斗、埋點 | **已有**：migration `041_product_events_and_bi_rpcs.sql`、`src/types/supabase.ts` |
| `get_daily_gmv` | RPC 聚合每日 GMV | **已有**（同上） |
| `get_product_funnel` | RPC 依事件類型計數 | **已有**（同上） |
| `weekly_insights` | 週報洞察 | **已**存在；供前台 Analytics，**≠** 後台商品漏斗 |
| `admin_logs` | 後台稽核 | **已有**：[`044_admin_logs.sql`](../supabase/migrations/044_admin_logs.sql)、[`append-admin-audit-log.ts`](../src/lib/admin/append-admin-audit-log.ts) |

---

## 5. 資料流示意（目標 vs 現況）

```mermaid
flowchart LR
  shopEvents[Shop_and_checkout_events]
  product_events_tbl[(product_events)]
  adminDash[admin_dashboard_BI]
  shopEvents -->|"08 規劃"| product_events_tbl
  product_events_tbl -->|"funnel_Top10"| adminDash
```

埋點與 RPC 已接線；若漏斗數字異常請檢查前台 `track` 呼叫與 Edge Notify 的 `purchase` 寫入。

---

## 6. 前台路由／能力 × 建議後台模組（08 未列或僅間接涵蓋）

以下依 [docs/06-pages.md](06-pages.md) 與實際 `src/app/(main)`、`(auth)` 的 `page.tsx` 盤點。

### 6.1 建議新增或補強的 Admin 模組

| 前台／資料 | 說明 | 建議後台 |
|------------|------|----------|
| `announcements` | [src/app/(main)/announcements/page.tsx](../src/app/(main)/announcements/page.tsx) 讀取已發布公告 | **`/admin/announcements`**（列表、建立／編輯、`is_active`、`published_at`）；需搭配 RLS／staff policy |
| `user_shop_point_ledger`、`user_shop_point_lots` | [06-pages § `/settings`](06-pages.md#settings個人設定頁首標題我的) 點數與批次 | **選做**：`/admin/shop-points` 或訂單側工具——手動發放／沖帳（**僅 super_admin**、建議搭配 `admin_logs` 或稽核） |
| `/settings/coupons` | 公開活動摘要 | **已接**：`promo_campaigns.show_in_member_app`；結帳折抵後續擴充 |
| `food_cache` | 飲食紀錄搜尋快取 | 08／06 未要求 MVP 後台；若需人工審核可另開 **低優先** 模組 |

### 6.2 不需一對一後台「頁面」的前台區塊（僅供對照）

用戶端：`/dashboard`、`/log`、`/guard`、`/guard/records`、`/analytics`、`/shop/*`（商業主檔已由 08 覆蓋）、`/support`、`/onboarding`、`/settings` 多數子頁。營運視角以 **訂單／用戶／BI** 聚合即可，除非要做 **公告、點數、折價券** 等營運工具。

---

## 7. 建議優先順序（延續 08 語氣）

| 優先級 | 項目 |
|--------|------|
| **P0** | 若要做 08 的 BI：**migration** `product_events` + RPC + 前台／金流埋點；擴充 [dashboard](../src/app/admin/dashboard/page.tsx)（時間範圍、圖表、漏斗、Top 10）。 |
| **P0** | 訂單：**退款**與狀態規則對齊商業／08（限制可手動變更狀態、`super_admin` 退款流占位實作或隱藏無權操作）。 |
| **P1** | 用戶詳情：**註冊日**（多為 `auth.users.created_at`，需安全 RPC）、**停用帳號**（Edge + `user.suspend`）。 |
| **P1** | **公告後台**（前台已依賴 `announcements`）。 |
| **P2** | `admin_logs`、點數手調、優惠券後台、食物快取審核。 |

---

## 8. 規格錨點與關鍵程式路徑索引

### 8.1 docs 錨點（便于 Review）

- [08-admin — 路由結構](08-admin.md#路由結構)
- [08-admin — 角色設計 / 權限表](08-admin.md#角色設計)
- [08-admin — DB 補充](08-admin.md#db-補充後台需要的額外資料表)
- [08-admin — 前端埋點設計](08-admin.md#前端埋點設計)
- [08-admin — BI 儀表板](08-admin.md#bi-儀表板)
- [08-admin — 商品／訂單／用戶管理](08-admin.md#商品管理)
- [06-pages — `/dashboard`](06-pages.md#dashboard總覽)
- [06-pages — `/shop` 與設定](06-pages.md#shop-和-shopproductid)
- [06-pages — `/analytics`](06-pages.md#analytics數據分析)
- [06-pages — `/settings` 次級頁](06-pages.md#次級頁)

### 8.2 關鍵原始碼

| 議題 | 路徑 |
|------|------|
| Admin 儀表板 | [src/app/admin/dashboard/page.tsx](../src/app/admin/dashboard/page.tsx) |
| 商品編輯 | [src/app/admin/products/_components/product-editor.tsx](../src/app/admin/products/_components/product-editor.tsx) |
| 訂單狀態 | [src/app/admin/orders/_components/order-status-updater.tsx](../src/app/admin/orders/_components/order-status-updater.tsx) |
| 用戶列表 RPC | [src/app/admin/users/page.tsx](../src/app/admin/users/page.tsx)（`admin_users_directory`） |
| 用戶詳情 | [src/app/admin/users/[id]/page.tsx](../src/app/admin/users/[id]/page.tsx) |
| 權限定義 | [src/lib/admin/permissions.ts](../src/lib/admin/permissions.ts) |
| Admin middleware | [middleware.ts](../middleware.ts)（`ROLE_ACCESS`） |
| 公告前台 | [src/app/(main)/announcements/page.tsx](../src/app/(main)/announcements/page.tsx) |

---

✓ 本檔為盤點／待辦清單；若後續實作與 [docs/08-admin.md](08-admin.md) 契約變動，請依 [.cursor/rules/04-changelog.mdc](../.cursor/rules/04-changelog.mdc) 另記異動。
