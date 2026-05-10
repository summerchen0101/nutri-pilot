# 中性邊框加深／底圖上半透白卡無外框

**日期**：2026-05-10  
**影響規格**：docs/09-ui-design.md（邊框／卡片章節）、.cursor/rules/05-ui-design.mdc  
**類型**：修改

## 原規格

- 卡片預設 `0.5px solid var(--color-border-tertiary)`。
- 中性邊框 hex／`--border` HSL 為既有較淡數值。

## 實際做法

- `--color-border-tertiary`／`--color-border-secondary`、`--border`（HSL）略加深，讓列表分隔、表單、`divide-border`、圖表格線等仍看得更清楚。
- `--steel-border` 略加深色與透明度，Steel 區塊細線同步略顯。
- 疊在全站底圖上的半透明白卡主容器（`Card`、`SectionCard`、`bg-card` 外殼等）改為**無 neutral 外框**；需互動或區隔處保留：`Input`、outline／segment 底盤、列表 `divide`／`border-t`、主色／Steel 語意描邊、`hover:border-*` 搭配 `border-transparent` 預設。
- Bottom sheet 面板外殼移除頂側 neutral 細框（把手與標題區不變）。

## 原因

細灰線在半透卡＋底圖上對比不足；使用者希望大卡不靠灰框而以底色與圓角區隔，其餘功能性線條則維持可辨識度。

## 後續

建議择机將 `docs/09-ui-design.md` 邊框／卡片段落改為「底圖上半透卡無外框，分隔與表單仍用 token」之敘述，與實作對齊。
