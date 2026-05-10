# 全站頁面底改為紋理背景圖（bg.jpg）

**日期**：2026-05-10  
**影響規格**：docs/09-ui-design.md  
**類型**：修改

## 原規格

- 「背景」表中：主要背景 `#FFFFFF`；次要區塊／頁面底感 `#F7F8F6`（`--surface-secondary`）。  
- 原則上以 flat 為主，不用漸層背景。

## 實際做法

- 在 `src/app/globals.css`：`html` 使用 `background-color: hsl(var(--background))` 作實色底；底圖經 `html::before`（`position: fixed` + `opacity: var(--app-bg-photo-opacity)`，預設 `0.1`）套用 `url('../imgs/bg.jpg')`、`cover`、`left top`；`body` 為透明底並設 `position: relative; z-index: 1`，讓內容叠在質感層之上。  
- 移除 `MainAppShell`、`(auth)/layout`、`(main)/loading` 上會蓋住視窗的實色底（`bg-surface-secondary`）與 auth 的漸層 wrapper，讓底圖透出。  
- 卡片與內容區仍沿用既有白／語意底色元件，維持對比。

## 原因

產品希望接近參考稿的輕質感、紙／光影質感頁面底，而非單色 `#F7F8F6`。

## 後續

若規格書要完全對齊，可於 `docs/09-ui-design.md`「背景」段落增列「全站底層可選質感圖」與 `cover`／定位約定；目前僅以本異動檔紀錄決策。
