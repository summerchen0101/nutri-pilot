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

### 飲食計畫（`/plan`）

- `page.tsx`：移除 `max-w-3xl` 外層（由 `MainAppShell` 負責寬度），標題 `text-xl font-medium`、副標 `text-[13px]`。
- `plan-view.tsx`：計畫進度卡／達成率大字＋`h-[5px]` track（`bg-secondary`）與綠色 fill（`#1D9E75`）。
- 7 日 pill：今日 `#1B7A5A`、完成日 `#E0F5EE`／`#0F6E56`、未來 `bg-secondary`；選取加 `ring`。
- 每餐一張 `rounded-xl border-[0.5px] border-border bg-card p-4`；右側打卡改為方形 checkbox 樣式（`rounded-[10px]`、已勾 `#E0F5EE`）。
- 生成中 Skeleton：`animate-pulse`、`rounded-xl`、`bg-secondary`。
- 錯誤區塊：`bg-[#FCEBEB]`；modal：`rounded-2xl`、`bg-foreground/35` 遮罩。

### 飲食紀錄（`/log`）

- `page.tsx`：對齊 `MainAppShell`，標題 `text-xl font-medium`；右上角連結改為「總覽」→ `/dashboard`。
- `log-client.tsx`：餐次 Tab／搜尋·拍照切換為 **pill**（`rounded-full`），active 主色、inactive **ghost + 0.5px 邊框**；今日熱量 **大字 + 單位縮小**；搜尋結果僅品名 + 來源色點；紀錄列表 **碳水／蛋白／脂肪** 語意色一行；列表卡片用共用 `Card`；拍照分析中 **Skeleton**；錯誤 `text-destructive`。
- `add-food-from-search.tsx`：確認區塊 `bg-secondary rounded-xl border-[0.5px]`；2×2 營養格 **rounded-[10px]**、數值 **text-xl font-medium**；AI 警示 **`bg-[#FDF0D5] border-[#FAC775] rounded-xl`**；移除未定義之 `var(--color-*)`，改為 **foreground / border / muted** 等語意 class。

### 待辦（後續 MR／提交）

- Settings 等頁面視覺與殼層 padding 對齊。
- Analytics／Shop／Admin 目前頁面為空，依規格跳過或僅占位。
- Recharts 統一樣式（待 Analytics 有圖表後）。
