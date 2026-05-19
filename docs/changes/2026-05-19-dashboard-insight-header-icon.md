# 今日建議改 Header 燈泡 icon

**日期**：2026-05-19  
**影響規格**：docs/06-pages.md、docs/03-features.md、docs/04-ai-engine.md

## 異動摘要

- 「今日建議」由右下角浮動圓鈕改為 `StickyPageHeader` 右上角燈泡 icon（順序：AI 精靈 → 今日建議 → 公告 → 客服）。
- 未讀提示由整顆 `ring`／`pulse` 改為 icon 右上角綠點（與公告紅點同 pattern）。
- AI 精靈 header icon 改為 `text-primary` 綠色 Sparkles。
- `DashboardInsightSkeleton` 改為 header icon 同尺寸 inline 占位。

## 原因／後續

浮動鈕在底欄上方易形成雙圈雜訊且語意不清；與 AI 精靈等同列 header 較一致。Bottom Sheet 內容與快取邏輯不變。
