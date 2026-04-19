# 色彩系統改為 Sea Green + Shadow Grey

**日期**：2026-04-20  
**影響規格**：docs/09-ui-design.md、.cursor/rules/05-ui-design.mdc  
**類型**：修改

## 原規格

主色為 Forest Green 系列（`#1B7A5A`、`#0F6E56`、`#E0F5EE`、`#085041` 等）；主要 CTA 按鈕與互動主色皆為同一綠色。

## 實際做法

1. **Sea Green（互動主色）**：`#4C956C`（本體）、`#3A7A56`（深／hover 加深）、`#E8F5EE`（淡背景）、`#2D6B4A`（淡背景上的主色文字）。
2. **Shadow Grey（Primary CTA）**：`#1E212B` 背景、`#2A2F3D` hover；用於加入購物車、加入紀錄、儲存等主要操作按鈕（`Button` default）。
3. **次要互動**（tab active、打卡 checkbox、進度條主線、outline 按鈕、輸入 focus）：維持 Sea Green `#4C956C`。
4. **底部導覽 active**：`bg-[#E8F5EE] text-[#4C956C]`。
5. **全域**：`globals.css` 新增 `--primary`、`--primary-dark`、`--primary-light`、`--primary-text`、`--shadow-grey`、`--surface-secondary`（`#F7F8F6`）；`tailwind.config.ts` 延伸 `primary`、`shadow-grey`、`surface` 色票。
6. **語意色**：Amber `#EF9F27`、Blue `#378ADD`、Danger `#E55A3C` 不變。

## 原因

產品視覺改版：主色改為較柔和的 Sea Green，並將主要 CTA 與次要互動綠色區隔（深色按鈕 vs 綠色互動反馈）。

## 後續

已同步更新 `/docs/09-ui-design.md` 與 `.cursor/rules/05-ui-design.mdc`；歷史 changelog 檔保留當時色碼以利追溯。
