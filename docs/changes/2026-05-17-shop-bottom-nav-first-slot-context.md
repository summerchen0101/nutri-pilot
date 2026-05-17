# 商城底欄首欄：商城首頁與總覽情境切換

**日期**：2026-05-17  
**影響規格**：docs/09-ui-design.md（商城導覽）；與同日 `shop-nav-dashboard-settings-route` 紀錄之「首欄恒連 `/dashboard`」不一致處仍以本紀錄為準  
**類型**：修改

## 原規格／先前紀錄

- [`docs/changes/2026-05-17-shop-nav-dashboard-settings-route.md`](2026-05-17-shop-nav-dashboard-settings-route.md)：商城底欄首欄改連 **`/dashboard`**，標籤「**總覽**」。  
- 實作曾一度為首頁連儀表板、文案「首頁」（與紀錄略有不一致）。

## 實際做法

[`ShopBottomNav`](../../src/components/layout/shop-bottom-nav.tsx) 首欄依是否為商城目錄首頁（[`isShopCatalogHomePathname`](../../src/lib/shop/shop-path.ts)：`/shop`）分支：

| 情境 | `href` | 標籤 | 圖示 |
|------|--------|------|------|
| 非 `/shop` 之商城樹路由 | `/shop` | 首頁 | `Home` |
| `/shop`（商城目錄首頁） | `/dashboard` | 總覽 | `LayoutDashboard`（與主選單「總覽」一致） |

無障礙：`aria-label` 分別為「前往商城首頁」「前往總覽」。

## 原因

在商城子頁需一鍵回到商城首頁；在商城首頁則將首欄改為離開商城進入主流程「總覽」（儀表板），避免首欄與當前頁重複、並與使用者心智「home ↔ 離開／進入總覽」對齊。

## 後續

視需要將 `docs/09-ui-design.md` 商城專用底欄首欄行為同步為本表。

