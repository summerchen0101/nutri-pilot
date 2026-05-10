# Hairline 邊框改由 Tailwind plugin 提供

**日期**：2026-05-10
**影響規格**：docs/09-ui-design.md、.cursor/rules/05-ui-design.mdc
**類型**：技術替換

## 原規格

邊框極細線在 **`pointer: coarse`** 時改為 **1px**（見 `docs/changes/2026-05-10-coarse-pointer-hairline-borders.md`）。先前實作為在 `src/app/globals.css` 以 **`@media (pointer: coarse)`** 覆寫 Tailwind 產生的 **`border-[0.5px]`**、`border-t|b|l-[0.5px]`、`divide-y-[0.5px]` 等類別（含 `!important`）。

## 實際做法

- 新增 [`tailwind-hairline-plugin.ts`](../../tailwind-hairline-plugin.ts)：以 **`addUtilities`** 提供 **`border-hairline`**、`border-t|b|l|r-hairline`、`divide-y-hairline`（fine 用 `theme.extend.borderWidth.hairline`，coarse 改 **1px**）；以 **`addBase`** 在 coarse 下設定 **`--hairline-border-shorthand`**。
- [`tailwind.config.ts`](../../tailwind.config.ts) 註冊該 plugin，並設 **`borderWidth.hairline: '0.5px'`**。
- 全站將 **`border-[0.5px]`** 等 arbitrary class 替換為上述語意 utilities。
- `globals.css` **移除**對 escaped Tailwind 類別的覆寫區塊；**保留** `:root` 預設 **`--hairline-border-shorthand`**。

## 原因

避免依賴 JIT 產生的類別字串與 fragile 的 escaped 選擇器；將寬度與 coarse 行為集中在 Tailwind 設定／plugin，符合維護與搜尋語意（`border-hairline`）。

## 後續

已同步更新 `docs/09-ui-design.md`、`.cursor/rules/05-ui-design.mdc`。舊 changelog `2026-05-10-coarse-pointer-hairline-borders.md` 仍記錄問題背景；實作位置以此檔為準。
