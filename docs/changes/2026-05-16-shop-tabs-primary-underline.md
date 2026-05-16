# 商城分類與商品詳情 Tab：主綠 active、字級與貼底底線

**日期**：2026-05-16
**影響規格**：docs/09-ui-design.md
**類型**：修改

## 原規格

- `blue-400`（`#378ADD`）條目註明用途包含「active 狀態（商城分類）」。
- Tab／互動主色整體以 Sea Green（`#4C956C`）為主。

## 實際做法

- 商城列表分類列與商品詳情「介紹／配送／付款」Tab：未選中為 `text-foreground`、`text-heading-section`（15px）；選中為 `text-primary`＋`font-medium`＋`border-b-2 border-primary`，並以 `-mb-px` 與列底 `border-b-hairline` 對齊，移除鈕內 `absolute` 色塊與多餘的列底 padding。
- 商品詳情三 Tab 以 `flex-1 basis-0 min-w-0 text-center` 均分寬度。

## 原因

- 產品需求：分類與詳情 Tab 視覺一致，active 改為主綠底線與綠字，字級加大、主色文字，底線貼齊列底不懸空。
- 原先實作使用 `--steel-accent`（藍）作為指示線，與上述需求不符。

## 後續

- 建議更新 `docs/09-ui-design.md` 中「商城分類 active 用藍」之敘述，改為與主色 Tab 一致，或註明藍色僅保留給指定元件（例如碳水進度條），避免與程式不一致。
