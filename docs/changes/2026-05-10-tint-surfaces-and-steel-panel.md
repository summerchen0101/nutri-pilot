# 他色區塊半透 + 綠卡／Steel Blue 語意統一

**日期**：2026-05-10  
**影響規格**：docs/09-ui-design.md、[2026-05-10-card-surfaces-translucent.md](./2026-05-10-card-surfaces-translucent.md)  
**類型**：修改  

## 原規格

- 綠：`--primary-light` 為 hex 實色；部分元件硬編 `#E8F5EE`／`#2D6B4A`。  
- Steel Blue：`#E6F1FB`／`#B5D4F4` 等散落於 analytics、badge info。  
- `muted`／`secondary` HSL triple 不透明，与白卡半透並行時質感不一致。  

## 實際做法

- [`src/app/globals.css`](../src/app/globals.css)：`--app-tint-surface-opacity`（預設 0.4，可與白卡分調）；`--muted`／`--secondary` 加上 alpha；新增 `--primary-light-panel`（≈ `#E8F5EE`）與 `--steel-panel`／`--steel-border`／`--steel-panel-hover`、`--steel-text`、`--steel-accent`。  
- [`tailwind.config.ts`](../tailwind.config.ts)：`primary.light` 改為 `hsl(var(--primary-light-panel))`；新增 `steel.panel`、`steel.border`、`steel.foreground`、`steel.accent`、`steel.hover`。  
- 移除／替換 Badge success／info、Button outline、analytics 快速導覽／AI 週報區、weekly-report-share 標題、商城分類／推薦角標、Onboarding 飲食法選取、Guard／Log 上傳區、飲水格、settings 頭像與目標 pill 等硬編或混用色；綠意大區邊框統一 `border-primary/20`、dashed 用 `border-primary/30`；淡綠底上文字以 `text-primary-foreground` 為主。  
- 飲水格填色改 `steel-accent`／`steel-border`，與 AI 卡同色票系。  

## 原因

底色圖上要讓灰綠與藍系「卡片」與白卡同層都是可調透明度；並以 token + Tailwind 語意收斂綠／藍，便於對齊 `docs/09`。  

## 後續

若需對齊文件，可在 `docs/09-ui-design.md` 補 `--app-tint-surface-opacity` 與 `steel.*` 對照表（目前以本紀錄為準）。開發收尾請於 Dashboard／Log／Analytics／Shop／Onboarding／Settings 對光底圖目視對比。
