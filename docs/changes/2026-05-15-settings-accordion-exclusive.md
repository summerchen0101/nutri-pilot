# 設定頁：摺疊分組改為手風琴（同時僅一段展開）

**日期**：2026-05-15  
**影響規格**：docs/changes/2026-05-15-settings-accordion.md（先前的摺疊 UX 紀錄）  
**類型**：修改

## 原規格（先前紀錄與行為）

`docs/changes/2026-05-15-settings-accordion.md` 記載：`sessionStorage` 鍵 `nutri_settings_sections_v1` 以 JSON 記錄「各區塊 boolean」，意即可各自獨立展開／收合。

## 實際做法

- 同一瀏覽階段內**最多只有一個**主題分區處於展開狀態；展開另一區時會自動收合先前展開區。
- 使用者可將目前展開區再點一次以全部收合（expanded 為 `null`）。
- `sessionStorage` 仍使用鍵 **`nutri_settings_sections_v1`**，儲存格式改為 **`{ "v": 2, "expanded": "health" | "diet" | "shop" | "account" | null }`**。
- **相容舊資料**：若讀取到舊版「各區塊 boolean」JSON，會依固定順序（健康 → 飲食 → 商城 → 帳號）取**第一個**為 `true` 的區塊作為還原的展開目標（皆無 `true` 時預設「健康與目標」）。

## 原因

降低設定頁垂直長度與視覺雜訊，讓使用者專注在單一主題區塊內編輯。

## 後續

視需要將 `docs/06-pages.md` `/settings` 補一句「分組為手風琴，同一時間僅一段展開」。
