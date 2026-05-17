# 全站頁首圖示按鈕與商城無框 foreground 對齊

**日期**：2026-05-17
**影響規格**：docs/09-ui-design.md（PageHeader／頁首互動）
**類型**：修改

## 原規格

- 全站 `HEADER_ACTION_ICON_CLASS`：透明底 + **主色 1.5px 框線**，hover 填主色（見 `header-action-icon-styles` 註解）。
- `HEADER_LEADING_ICON_CLASS`：**卡片底** + 主色圖示，hover 填主色。
- 商城右側圖示另用 `SHOP_HEADER_ICON_BUTTON_CLASS`：**無框、foreground**、透明度 hover。

## 實際做法

- 新增 **`PAGE_HEADER_ICON_BUTTON_CLASS`**，與原商城 `SHOP_HEADER_ICON_BUTTON_CLASS` 字串一致。
- **`HEADER_LEADING_ICON_CLASS`**、**`HEADER_ACTION_ICON_CLASS`** 皆改為與其相同（全站頁首左／右圖示統一無框黑／foreground）。
- **`shop-header-icon-styles.ts`** 改為 **re-export** `PAGE_HEADER_ICON_BUTTON_CLASS` 為 **`SHOP_HEADER_ICON_BUTTON_CLASS`**，移除重複定義與未使用之 `SHOP_HEADER_LEADING_ICON_CLASS`。
- **Dashboard AI 精靈**觸發鈕移除 `text-primary` 覆寫，與全站頁首一致。

## 原因

產品希望所有頁首 icon 按鈕視覺與商城一致（無框、foreground），避免主色框線與卡片底在頂欄顯得厚重。

## 後續

- 若需更新 UI 規格書中「頁首右上角主色框」描述，請同步改寫 **docs/09-ui-design.md**。
