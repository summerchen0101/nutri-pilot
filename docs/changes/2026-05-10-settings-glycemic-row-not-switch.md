# 飲食偏好：糖量／血糖 Switch 軌道開啟態用主綠

**日期**：2026-05-10
**影響規格**：docs/09-ui-design.md（開關未單獨條文化）
**類型**：修改

## 原規格

設計書未細定系統開關軌道色；Sea Green `--primary` 為互動主色。

## 實際做法

「糖量／血糖相關提醒」使用 `role="switch"`。開啟時軌道 **`bg-primary`**（Sea Green `#4c956c`），關閉 `bg-muted`，圓鈕 **`bg-card`**（白／卡面色）。`glycemicPending` 時 `opacity-60` + `disabled`。

曾誤將開關改為整列 `SettingsRow` 點選，已還原為軌道開關。

## 原因

產品要求軌道底為 primary 綠。

## 後續

可選於 `docs/09-ui-design.md` 補一句「設定內 Toggle：開啟軌 bg-primary」。

