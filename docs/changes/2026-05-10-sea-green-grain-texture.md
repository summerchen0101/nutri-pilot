# Sea Green 實心底雜點質感

**日期**：2026-05-10
**影響規格**：docs/09-ui-design.md、.cursor/rules/05-ui-design.mdc（仍禁止漸層；僅疊靜態紋理）
**類型**：修改（視覺）

## 原規格

主色 Sea Green 為單色平塗實底；規範寫「不用漸層背景」。

## 實際做法

在 `:root` 定義 `--primary-grain-*`，並在 `globals.css` 的 `@layer utilities` 對 `.bg-primary`、`hover:bg-primary`、`hover:bg-primary-dark`、`active:bg-primary-dark` 疊加平鋪的 SVG `feTurbulence` 雜訊與 `background-blend-mode`，不加入漸層。少數 `bg-[#4C956C]`／inline 進度條色改為 `bg-primary`／`border-primary`／`bg-primary` 以繼承同一套質感。

## 原因

強化品牌綠實心底的手感與層次，與全站仍使用之 Sea Green 語意一致。

## 後續

視覺強度可僅調 `--primary-grain-svg`（opacity）、`--primary-grain-blend`、`--primary-grain-tile`。若日後要再加上漸層式立體需另更新 UI 規範與 changelog。
