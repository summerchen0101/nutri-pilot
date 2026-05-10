# 卡片表面改為半透明（叠於底圖）

**日期**：2026-05-10  
**影響規格**：docs/09-ui-design.md、docs/changes/2026-05-10-app-textured-background.md  
**類型**：修改  

## 原規格

- `docs/changes/2026-05-10-app-textured-background.md`：全站質感底圖上，卡片與內容區仍沿用既有白／語意底色元件，維持對比（實色）。  

## 實際做法

- [`src/app/globals.css`](../src/app/globals.css)：`--card` 改為 `0 0% 100% / var(--app-card-surface-opacity)`，預設 `--app-card-surface-opacity: 0.82`，可與既有 `--app-bg-photo-opacity` 一併目視微調  
- [`src/components/guard/label-guard-report-body.tsx`](../src/components/guard/label-guard-report-body.tsx)：報告區外層由 `bg-secondary` 改為 `bg-card`（半透），與全站卡片一致  
- 移除強制不透明白底：`SectionCard` 上 `bg-neutral-bg-primary`（Settings 數張）、[`guard/records/page.tsx`](../src/app/(main)/guard/records/page.tsx) 的 `!bg-white`、硬編 `bg-[var(--color-background-primary)]` 改為 `bg-card`（Log／營養卡／手動輸入等）；[`shop-home-skeleton.tsx`](../src/app/(main)/shop/shop-home-skeleton.tsx) 商品格改 `bg-card`  
- [`guard-saved-record-detail-client.tsx`](../src/app/(main)/guard/records/guard-saved-record-detail-client.tsx)：標題與圖片外框用 `bg-card`；圖片與無圖佔位內層保留 `bg-neutral-bg-primary`（不透明），避免透明像素底下花紋干擾閱讀  
- [`bottom-sheet-shell.tsx`](../src/components/ui/bottom-sheet-shell.tsx) 等浮層維持實色，未納入本次  

## 原因

產品希望底圖質感在主要內容卡片上也能微微透出；以單一 `--card` token 統一，`--app-card-surface-opacity` 便於調校可讀性與質感平衡。  

## 後續

若規格書要完全對齊，可於 `docs/09-ui-design.md`「背景／卡片」段補充半通透明度約定與與 `--app-bg-photo-opacity` 的搭配方式。  
