# UI 設計系統

> 所有頁面與元件的視覺規範。  
> Cursor 實作任何 UI 前，先讀此文件。  
> 設計風格：**乾淨、自然、有溫度的健康科技感**。

---

## 設計方向

**核心關鍵字**：Natural / Calm / Precise  
不是冷硬的醫療感，也不是過度活潑的 fitness app。  
像一個真正懂你身體、說話有條理的私人營養師。

**視覺特徵**：
- 大量留白，資訊密度適中不擁擠
- 圓角柔和，邊框極細（0.5px）
- 數字用 medium weight 突出，單位用 regular 縮小
- 動態輕柔，過渡 150–200ms ease

---

## 色彩系統

### 主色 — Sea Green（互動、次要用色）

| 角色 | Hex | 用途 |
|------|-----|------|
| 主色本體 | `#4C956C` | 按鈕描邊（outline）、圓環、active 狀態、主要互動（tab、checkbox、進度條主線）、**非** filled 主按鈕背景 |
| 主色深 | `#3A7A56` | hover／需加深的綠色互動（與 Tailwind／CSS `--primary-dark` 對齊） |
| 主色淡 | `#E8F5EE` | 淡背景、badge 背景、打卡／成功 pill、bottom nav active 背景 |
| 主色文字 | `#2D6B4A` | 淡綠底上的標籤／完成日文字 |

### 深色 — Shadow Grey（Primary CTA）

| 角色 | Hex | 用途 |
|------|-----|------|
| 本體 | `#1E212B` | **主要 CTA**（加入購物車、加入紀錄、儲存）filled 按鈕背景、重要標題感 |
| Hover | `#2A2F3D` | 上述按鈕 hover |

### 背景

| 用途 | Hex |
|------|-----|
| 主要背景 | `#FFFFFF` |
| 次要區塊／頁面底感 | `#F7F8F6`（極淡灰綠，CSS `--surface-secondary`） |

### 輔色 — Amber

| Token | Hex | 用途 |
|-------|-----|------|
| `amber-50` | `#FDF0D5` | 待打卡 pill 背景、warning 背景 |
| `amber-200` | `#FAC775` | 圖表輔助 |
| `amber-400` | `#EF9F27` | 脂肪進度條、星等評分、warning 強調 |
| `amber-600` | `#BA7517` | warning 文字 |

### 第三色 — Steel Blue

| Token | Hex | 用途 |
|-------|-----|------|
| `blue-50` | `#E6F1FB` | AI 建議卡背景、info 背景 |
| `blue-300` | `#85B7EB` | 圖表輔助 |
| `blue-400` | `#378ADD` | 碳水進度條、active 狀態（商城分類） |
| `blue-600` | `#185FA5` | AI 建議文字、info 文字、連結 |

### 語意色

| 用途 | Hex | 說明 |
|------|-----|------|
| 錯誤/危險按鈕 | `#E55A3C` | 退款、刪除、停用 |
| 錯誤文字 | `#E24B4A` | 超標警示 |
| 錯誤背景 | `#FCEBEB` | 錯誤狀態 |
| 購物車 badge | `#E24B4A` | 數量紅點 |

（Amber／Blue／Danger 與上表維持不變；**主綠由 Forest Green 改為 Sea Green**，**filled 主按鈕改 Shadow Grey**。）

### 全域 CSS 變數（`src/app/globals.css`）

互動綠與 CTA 深色請優先對齊程式中的變數，避免散落舊色碼：

```css
--primary: #4c956c;
--primary-dark: #3a7a56;
--primary-light: #e8f5ee;
--primary-text: #2d6b4a;
--shadow-grey: #1e212b;
--shadow-grey-hover: #2a2f3d;
--surface-secondary: #f7f8f6;
```

Tailwind：`primary` / `primary-dark` / `primary-light` / `primary-foreground`、`shadow-grey` / `shadow-grey-hover`、`surface-secondary`。

### 中性色（使用 CSS 變數，自動 dark mode）

```css
--color-background-primary    /* 白 / 深黑 */
--color-background-secondary  /* 淺灰 / 深灰，卡片內格 */
--color-background-tertiary   /* 頁面底色 */
--color-text-primary          /* 主文字 */
--color-text-secondary        /* 次要文字 */
--color-text-tertiary         /* 輔助文字、placeholder */
--color-border-tertiary       /* 預設邊框（0.5px）*/
--color-border-secondary      /* hover 邊框 */
```

---

## 字體系統

字體使用系統預設（`font-family: var(--font-sans)`），不另外引入字型。

| 用途 | Size | Weight | 範例 |
|------|------|--------|------|
| 頁面標題 | 20px | 500 | 今日概覽、健康商城 |
| 區塊標題 | 15px | 500 | 今日餐食、為什麼適合你 |
| 卡片小標 | 13px | 500 | 早餐、體重 |
| 內文 | 13px | 400 | 描述、食物名稱 |
| 輔助文字 | 11px | 400 | 標籤、副說明 |
| 超小標 | 10px | 400 | nav 標籤、角標 |
| 數字大值 | 20px | 500 | 熱量、體重數字 |
| 數字單位 | 13px | 400 | kg、kcal（跟大數字並排縮小）|

---

## 間距系統

```
4px   — 超緊密（圖示與文字間距）
6px   — 緊密（tag 之間、小間距）
8px   — 標準小間距（grid gap、元件間）
10px  — 元件內 padding（小卡）
12px  — 標準 padding（大多數情況）
14px  — 頁面 padding、卡片 padding
16px  — 頁面外邊距、區塊間距
24px  — 大區塊間距
```

---

## 圓角系統

| Token | px | 用途 |
|-------|-----|------|
| `rounded-sm` | 4px | 進度條、細節元素 |
| `rounded` | 8px | badge、小 tag、小按鈕 |
| `rounded-md` | 10px | 按鈕、輸入框、分類切換 |
| `rounded-lg` | 12px | **卡片（最常用）** |
| `rounded-xl` | 16px | bottom sheet、modal |
| `rounded-full` | 9999px | pill badge、avatar、圓形按鈕 |

---

## 邊框原則

- **所有邊框 0.5px**，不用 1px
- 卡片預設：`0.5px solid var(--color-border-tertiary)`
- hover 狀態：`0.5px solid var(--color-border-secondary)`
- 主色強調：`1.5px solid #4C956C`（規格選擇 active 等）
- 輸入框 focus：`0.5px solid #4C956C` + `box-shadow: 0 0 0 2px rgba(76,149,108,.12)`

---

## 元件規範

### 按鈕

```css
/* Primary — 主要操作（加入購物車、確認、儲存）— Shadow Grey */
background: #1E212B;
color: #fff;
padding: 9px 18px;
border-radius: 10px;
font-size: 13px;
font-weight: 500;
/* hover: background: #2A2F3D */

/* Secondary — 次要操作（換食材、查看計畫）— Sea Green 描邊 */
border: 1.5px solid #4C956C;
color: #4C956C;
background: transparent;
/* hover: background: #E8F5EE */

/* Ghost — 最低優先（取消、關閉）*/
border: 0.5px solid var(--color-border-secondary);
color: var(--color-text-secondary);
background: transparent;

/* Danger — 破壞性操作（退款、刪除、停用）*/
background: #E55A3C;
color: #fff;

/* Small variant — 卡片內的小按鈕 */
padding: 5px 12px;
font-size: 11px;
border-radius: 8px;
```

### 輸入框

```css
padding: 9px 12px;
border-radius: 10px;
border: 0.5px solid var(--color-border-secondary);
background: var(--color-background-primary);
font-size: 13px;
transition: border-color 150ms, box-shadow 150ms;

/* focus */
border-color: #4C956C;
box-shadow: 0 0 0 2px rgba(76,149,108,.12);
outline: none;
```

### 卡片

```css
background: var(--color-background-primary);
border: 0.5px solid var(--color-border-tertiary);
border-radius: 12px;
padding: 14px 16px;
/* hover（可點卡片）: border-color: var(--color-border-secondary) */
/* transition: border-color 150ms */
```

### Badge / Pill

```css
font-size: 11px;
font-weight: 500;
padding: 3px 10px;
border-radius: 9999px;

/* 已打卡 / 符合計畫 / 成功 */
background: #E8F5EE;
color: #2D6B4A;

/* AI / 資訊 / 飲食法 */
background: #E6F1FB;
color: #185FA5;

/* 待打卡 / 注意 */
background: #FDF0D5;
color: #854F0B;

/* 錯誤 / 售完 */
background: #FCEBEB;
color: #A32D2D;

/* 一般 tag（有機、認證等）*/
background: var(--color-background-secondary);
color: var(--color-text-secondary);

/* 新品 / 特殊 */
background: #EEEDFE;
color: #3C3489;
```

### 進度條

```css
/* track */
background: var(--color-background-secondary);
border-radius: 4px;
height: 5px;

/* 碳水 */
fill: #378ADD;
/* 蛋白質 */
fill: #4C956C;
/* 脂肪 */
fill: #EF9F27;
/* 一般進度（打卡率等）*/
fill: #4C956C;
```

### 熱量圓環

```css
/* SVG circle */
stroke-width: 7px;  /* 或 8px，視尺寸 */
stroke-linecap: round;
/* track color: var(--color-border-tertiary) */
/* fill color: #4C956C */

/* 中心數字 */
font-size: 16px; font-weight: 500;  /* 大值 */
font-size: 10px; color: secondary;  /* 目標 */
font-size: 9px;  color: tertiary;   /* 單位 */
```

### 底部導覽

```css
background: var(--color-background-primary);
border: 0.5px solid var(--color-border-tertiary);
border-radius: 12px;
padding: 6px;

/* nav item */
font-size: 10px;
padding: 5px 12px;
border-radius: 8px;
color: var(--color-text-secondary);

/* active */
color: #4C956C;
background: #E8F5EE;
font-weight: 500;
```

### AI 建議卡

```css
background: #E6F1FB;
border: 0.5px solid #B5D4F4;
border-radius: 12px;
padding: 13px 15px;

/* 標籤 */
font-size: 11px; font-weight: 500; color: #185FA5;

/* 內文 */
font-size: 13px; line-height: 1.7;
```

### 指標格（Metric Card）

```css
background: var(--color-background-secondary);
border-radius: 10px;
padding: 11px 12px;
cursor: pointer;

/* label */
font-size: 11px; color: var(--color-text-secondary);

/* 數值 */
font-size: 20px; font-weight: 500;

/* 副說明 */
font-size: 10px; color: #4C956C;  /* 正向 */
font-size: 10px; color: var(--color-text-secondary);  /* 中性 */
```

---

## 動態與過渡

```css
/* 標準過渡（按鈕、卡片 hover）*/
transition: all 150ms ease;

/* 顏色過渡（邊框、背景）*/
transition: background 150ms, border-color 150ms;

/* 頁面進入（Framer Motion）*/
initial: { opacity: 0, y: 8 }
animate: { opacity: 1, y: 0 }
transition: { duration: 0.2, ease: 'easeOut' }

/* 列表 stagger */
transition: { delay: index * 0.04 }
```

---

## 頁面佈局原則

```
頁面外邊距：px-4（16px）
卡片間距：mb-2.5（10px）或 gap-2（8px）
區塊間距：mb-4（16px）
最大寬度：max-w-sm（384px），手機優先
```

---

## 各頁面色彩重點

| 頁面 | 主視覺元素 | 色彩重點 |
|------|-----------|---------|
| Dashboard | 熱量圓環 | Sea Green `#4C956C` 主環 |
| Plan | 日期 pill、打卡 | Sea Green active、Amber 待完成 |
| Log | 記錄卡片、拍照 | Sea Green 已記錄 |
| Analytics | 折線圖、長條圖 | Sea Green 體重線、Blue 熱量柱 |
| Shop | 商品卡、推薦 badge | Sea Green 符合計畫、各色 badge |
| Settings | 表單 | 輸入框 focus Sea Green |
| Admin | 儀表板、表格 | Sea Green KPI 正向、Amber 警示、Red 危險 |

---

## 禁止事項

- ❌ 不用 1px 邊框（統一 0.5px）
- ❌ 不用純黑 `#000000`（用 CSS 變數）
- ❌ 不用 `font-weight: 700`（最粗用 500）
- ❌ 不用 `font-size` 低於 10px
- ❌ 不用漸層背景（flat 為主）
- ❌ 不用 `box-shadow` 做視覺層次（用邊框代替）
- ❌ 商城頁不做即時熱量對比，只做長期符合度說明
