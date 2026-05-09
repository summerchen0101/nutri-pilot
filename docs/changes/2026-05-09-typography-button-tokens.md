# 字級與按鈕語意 Token

**日期**：2026-05-09  
**影響規格**：docs/09-ui-design.md  
**類型**：修改（實作对齊 + 實作單一真相）

## 原規格

字體與按鈕尺寸已定義於 UI 規格（px／padding），但未在 Tailwind 層集中為語意 class；`CardTitle` 實作為 15px，與規格表「卡片小標 13px」不一致。

## 實際做法

- 在 `tailwind.config.ts` 新增語意 `fontSize`：`heading-page`、`heading-section`、`heading-card`、`body`、`caption`、`micro`。
- 新增 `PageHeading`；`SectionHeading`、`CardTitle`、`CardDescription` 改用對應 token；`Button` 新增 `size`（`default` 對齊 padding 9px／18px；`sm` 對齊小按鈕規格）。
- 收斂全站 `text-[12px]`、`text-sm` 等離散寫法，並將多處數字大值改為 `text-heading-page`。
- 文件與 `.cursor/rules/05-ui-design.mdc` 補上「Tailwind 語意 class」與按鈕實作約定。

## 原因

統一字級與按鈕尺寸來源，避免各處任意 px 造成版感不一致，並便於日後只改設定即可全站聯動。

## 後續

- 規格書已補 Token 對照表；剩餘零散 `text-[NNpx]` 可漸進改為語意 class。
- 若某畫面需「區塊級 15px」標題於卡片內，優先使用 `SectionHeading` 或 `className` 覆寫並於 review 註記。
