# 換頁捲動至頂（pathname）

**日期**：2026-05-11
**影響規格**：docs/06-pages.md
**類型**：新增

## 原規格

頁面規格未描述路由切換時的捲動位置。

## 實際做法

在 root layout 掛載 client 元件 `ScrollToTopOnPathname`（[`src/components/layout/scroll-to-top-on-pathname.tsx`](../../src/components/layout/scroll-to-top-on-pathname.tsx)），於 `pathname` 變更時以 `useLayoutEffect` 將視窗捲回頂部（`window.scrollTo` 並同步 `document.documentElement`／`body.scrollTop`）；掛載時將 `history.scrollRestoration` 設為 `manual`，避免 `router.back()` 等返回後瀏覽器還原舊捲動位置而覆蓋回頂；並以 `requestAnimationFrame` 再跑一次回頂以對齊延後還原的情況。不依賴 query string 變更觸發。

## 原因

換頁後留在原捲動位置易造成迷失。

## 後續

- 若需要 `/log` 等僅 query（tab／date）變更也回頂，可改為監聽 `searchParams` 並依 Next 規範包 `Suspense`。
- 長頁可考慮共用 `PageHeader` 預設加上 `sticky top-0 z-30`、`-mx-4 px-4`（對齊主殼層 `px-4`）、`bg-background`、`pb-2`；可選 `sticky={false}` 關閉；`z-30` 宜低於底部導覽 `z-40`。頂部 safe-area 可依裝置再調。
