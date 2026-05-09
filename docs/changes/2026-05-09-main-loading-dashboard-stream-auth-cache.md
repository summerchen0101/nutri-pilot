# 主區路由載入態、Dashboard 串流與 Auth 請求去重

**日期**：2026-05-09  
**影響規格**：intro/07-navigation-and-ui-flows.md、docs/06-pages.md（側面對照；IA 無變更）  
**類型**：修改

## 原規格

文件未細述 `(main)` 換頁時的 loading UI、`getUser()` 在同一請求內的去重策略，以及首頁是否需分段串流載入區塊。

## 實際做法

- 新增 `(main)/loading.tsx`，在 Server Component 尚未就緒時顯示與 `MainAppShell` 對齊的 skeleton。
- `(main)` 的 `layout` 與各頁共用 `React.cache` 包裝的 `getCachedAuthContext()`，單一導覽請求只做一次 `getUser()`／一份 server Supabase client 建立（與同日誌其餘查詢共用）。
- `/dashboard`：首屏保留原每日／體重／餐食等查詢；「為你推薦」與「本週人氣品牌」各自以 `Suspense` 包住 async 子區塊並行資料載入，中間仍以 `PromoBanner`（靜態內容）維持原視覺順序。
- 底欄 `Link`：`touch-manipulation`、按下 `active:opacity-90`，圖示外層固定 `h-5 w-5` 避免 active 換版跳动。

## 原因

換頁與大批量 RSC payload 準備時間內使用者易覺「點了沒反應」。loading 可改善回饋；首頁最重的為全站商品／分數／品牌載入；`getUser` 去重可略減同請求的 Auth 往返。

## 後續

若要在 `docs/06-pages.md` 或 UI 規格標註「主殼載入標準元件」與 Dashboard 區塊串流順序可再補一段；非必須。
