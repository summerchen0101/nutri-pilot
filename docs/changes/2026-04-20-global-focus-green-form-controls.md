# 全站表單 Focus 與邊框樣式統一

**日期**：2026-04-20  
**影響規格**：docs/09-ui-design.md  
**類型**：修改

## 原規格

- 表單 focus 應以主色 Sea Green（`#4C956C`）呈現，並維持可辨識的互動狀態。
- 元件不應出現瀏覽器預設藍色 ring 或不必要灰框，避免和設計系統衝突。

## 實際做法

- 在 `src/app/globals.css` 新增全域覆蓋：移除預設 outline、保留 `focus-visible` 可及性外框、統一 `input/textarea/select` 的 focus 邊框與陰影為綠色，並對 `button:focus-visible` 套用綠色外框。
- 在 `tailwind.config.ts` 設定 `ringColor.DEFAULT = '#4C956C'`，避免使用預設藍色 ring。
- 調整 `Input` 元件與多個頁面中的 `select` 與 `button` class（含 onboarding、log、shop、auth error），將 `focus-visible:ring-slate-*` 等非主色樣式改為綠色 focus/focus-visible 組合。
- 針對 onboarding 過敏原列補上 `label` 無邊框、checkbox 自訂方塊 `outline-none ring-0`，降低多餘灰框出現機率。

## 原因

解決全站表單在不同瀏覽器出現的預設外框/藍色 ring 不一致問題，並讓焦點樣式符合既有 UI 規範與品牌主色，提升一致性與可用性。

## 後續

建議 QA 以鍵盤（Tab）與滑鼠分別檢查 Onboarding、設定、記錄頁的焦點顯示差異，確認 `focus` 與 `focus-visible` 行為符合預期。
