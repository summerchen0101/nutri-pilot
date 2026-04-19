# UI 視覺重整（進行中）

## 2026-04-20 — 基底主題與 Dashboard

### 基底

- `src/app/globals.css`：新增 HSL CSS 變數（background、foreground、card、muted、border、destructive、secondary）。
- `tailwind.config.ts`：對應 `foreground`、`muted-foreground`、`card`、`border`、`destructive` 等語意色。
- 共用元件：`button`、`card`、`badge`、`input` 對齊設計系統（0.5px 邊框、`rounded-xl` 卡片、`rounded-[10px]` 按鈕／輸入、字重不超過 `font-medium`）。
- `MainAppShell` + `BottomNav`：`max-w-sm mx-auto`、`px-4`、底部導覽 active `bg-[#E0F5EE] text-[#1B7A5A]`。
- `(main)/layout.tsx`：完成 onboarding 的使用者一律包在 `MainAppShell` 內。

### Dashboard（`/dashboard`）

- 頁面標題 `text-xl font-medium`，日期以 `Intl.DateTimeFormat('zh-Hant')` 顯示。
- 體重卡：`bg-card border-[0.5px] border-border rounded-xl`，數字 `text-xl font-medium`、單位縮小。
- 快速操作：四格 ghost（邊框 0.5px、`rounded-[10px]`），icon + 文字；第四格連結至 `/analytics`。
- 體重對話框：`rounded-2xl`、`bg-card`、遮罩 `bg-foreground/35`（避免純黑）。

### 刻意未實作（資料／範圍）

- 熱量圓環、今日餐食、AI 建議、連續打卡 badge：需額外 server 資料查詢，依指示未改 API／查詢邏輯。

### 待辦（後續 MR／提交）

- Plan、Log、Settings 等頁面視覺與殼層 padding 對齊。
- Analytics／Shop／Admin 目前頁面為空，依規格跳過或僅占位。
- Recharts 統一樣式（待 Analytics 有圖表後）。
