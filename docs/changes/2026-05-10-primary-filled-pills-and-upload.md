# 小型控制項與上傳區改主綠底白字

**日期**：2026-05-10
**影響規格**：docs/09-ui-design.md、.cursor/rules/05-ui-design.mdc
**類型**：修改

## 原規格

設計文件中「成功 pill／badge」與常用對照為淡綠底 `#E8F5EE` 配深綠字 `#2D6B4A`（Tailwind：`bg-primary-light`／`text-primary-foreground`）。底部導覽條文在文件中曾描述為淡底選中態；實作已為深綠條＋白字高光。

## 實際做法

以下改為 **`bg-primary` + `text-white`**（outline／連結類則為 `hover:bg-primary hover:text-white`），與 [src/components/layout/bottom-nav.tsx](src/components/layout/bottom-nav.tsx) 同色系的飽和主綠對齊：

- 共用：`Badge` `success`、`Button` `outline`、`EmptyState` 連結、[header-action-icon-styles.ts](src/components/layout/header-action-icon-styles.ts)
- 分頁／chip：紀錄頁區塊 tab、設定 bottom sheet 選項、Onboarding 飲食法選項（選中態副文改 `text-white/75`）、商城分類／規格／飲食 tag、儀表板小 pill、目標設定與個人檔小 pill、守衛報告低風險 tier badge
- 上傳區：紀錄／守衛拍照上傳虛線區（綠底、白字、虛線 `border-white/25`、`active:bg-primary-dark`）

**維持淡綠大面塊**：儀表板／商品頁／紀錄內資訊 `section`、`body-metrics-card` 列、個人頭像圓底色等仍以 `bg-primary-light` 不變。

## 原因

產品內使用者希望標籤、分頁選中態、上傳按鈕等與底部導覽一樣為「綠底白字」辨識，避免淡綠小控制項與導覽語意割裂。

## 後續

可選更新 `docs/09-ui-design.md` 與 `05-ui-design.mdc` 的「常用元件 Tailwind class 對照」與色彩表「主色淡」用途說明，區分「大面積面板」vs「小型 filled 控制項」。
