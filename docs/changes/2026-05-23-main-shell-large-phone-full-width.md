# (main) 大型手機全寬適配

**日期**：2026-05-23
**影響規格**：docs/09-ui-design.md（頁面佈局原則）

## 異動摘要

- `MainAppShell` 內容欄移除手機端固定 `max-w-sm`（384px），改為 `w-full` + `px-4`，大型手機（390–430px）內容自動撐滿可用寬度。
- 平板以上（`md` ≥ 768px）仍維持 `max-w-sm` 置中，與既有手機優先設計一致。
- 抽出共用常數 `MAIN_SHELL_CONTENT_WIDTH_CLASS`，供 loading、商城 sticky dock／詳情分頁列同步寬度。

## 原因／後續

- 底部導覽已全寬，內容欄 384px 上限在大型手機造成左右不一致空白。
- 常數見 `src/components/layout/main-shell-content-width-class.ts`；新增 sticky 列若需對齊主內容欄，請沿用此 class。
