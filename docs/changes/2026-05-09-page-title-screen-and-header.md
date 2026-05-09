# 頁面主標加大與 PageHeader 移除副文

**日期**：2026-05-09
**影響規格**：docs/09-ui-design.md、.cursor/rules/05-ui-design.mdc
**類型**：修改

## 原規格

- 「頁面標題」與「數字大值」皆 20px，共用 `text-heading-page`。
- `PageHeader` 可選顯示標題下的說明副文（`description`）。

## 實際做法

- 新增 `text-heading-screen`（24px／500）供螢幕頂主標：`PageHeading`、登入／Onboarding 頂層標題。
- `text-heading-page` 僅保留給數字大值等 20px 用途。
- `PageHeader` 移除 `description`；必要時用 `meta`（例如商品頁品牌一行）。商城頂部偏好摘要自 header 移除。
- 規格書與 UI rule 同步更新。

## 原因

主標需更顯眼，且避免放大 `heading-page` 導致全站數字一併變大；統一取消標題下灰色說明以簡化版面。

## 後續

已為永久決策；規格書已更新。
