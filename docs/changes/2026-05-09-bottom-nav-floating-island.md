# 底部導覽：浮島列＋半透明 active

**日期**：2026-05-09  
**影響規格**：docs/09-ui-design.md（與同日異動 [2026-05-09-bottom-nav-green-theme.md](./2026-05-09-bottom-nav-green-theme.md) 接續）  
**類型**：修改 | UI

## 原規格／前版實作

- `docs/09-ui-design.md` § 底部導覽仍為白底＋淡綠 active（文件尚未更新）。
- 同日前一版實作：全寬綠底、選取項為實心白底藥丸＋綠色 icon／文字。

## 實際做法

1. **浮島**：外層 `fixed` 左右 `px-3`、底邊含 safe area；內層 `nav` 為 `rounded-2xl`、`border-white/15`、`bg-primary`、`grid-cols-5`。外層 `pointer-events-none`、內層 `pointer-events-auto`，避免浮島外留白擋住頁面點擊。
2. **非選取**：`text-white/70`、`font-medium`。
3. **選取**：`bg-white/20`、`text-white`、`rounded-xl`（曾實作圖示上方白線指示後已依產品意見移除）。
4. **Focus**：`ring-white/80`、`ring-offset-1`、`ring-offset-primary`；維持 `aria-current="page"`。
5. 移除實心白底藥丸與 `scale-[1.02]`。

## 原因

差異化視覺、減少制式 Tab Bar 感，仍維持綠底白字識別與無漸層、字重 ≤500。

## 後續

若定案，建議統一更新 `docs/09-ui-design.md` § 底部導覽與 `.cursor/rules/05-ui-design.mdc` 之 quick reference。
