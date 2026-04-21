# Dashboard 首頁喝水小格與版面調整

**日期**：2026-04-21  
**影響規格**：docs/06-pages.md  
**類型**：新增 | 修改

## 原規格

- 總覽頁標題為「總覽」，含問候語輪播；主卡下方可顯示今日活動分鐘摘要。  
- `vital_logs.water_ml` 在 schema 中存在，但首頁與操作未使用。  
- 快速操作使用 `react-icons/fi`。

## 實際做法

- 首頁標題改為 **`Hi, {顯示名}`**（無名稱時 **Hi there**）；移除問候 pill。  
- **「尚未有達成紀錄」**：與日期同一橫列（左側 pill、右側日期），邏輯同前（`streakDays < 1` 且僅首次類或無里程碑）；有連續達成時改為左側連續天 pill。移除主卡下方活動分鐘列與對應查詢。  
- 體重／今日熱量雙卡縱向高度略縮（`min-h` 與 padding 調整）。  
- **喝水小格**：與「快速操作」並排；每格 250 ml、最多 8 格視覺上限；點第 *i* 格將當日 `vital_logs.water_ml` 設為 *(i+1)×250*；`setWaterMlForTodayAction` upsert 時保留當日既有 `weight_kg`；`logWeightAction` upsert 時保留當日既有 `water_ml`。  
- 快速操作五鍵改 **lucide-react**（`strokeWidth={1.8}`，與商店分類列一致風格）。

## 原因

對齊產品稿：首頁補回喝水紀錄、簡化首屏文案，並統一圖示庫以維持與商城一致的視覺語言。

## 後續

可視需要更新 `docs/06-pages.md` 總覽／Dashboard 段落以反映上述行為。
