# 移除飲食計畫功能，聚焦記錄與商城轉換

**日期**：2026-04-20  
**影響規格**：`docs/00-overview.md`、`docs/03-features.md`、`docs/06-pages.md`、`docs/07-api.md`、`.cursor/rules/00-project-overview.mdc`、`.cursor/rules/03-ai-engine.mdc`  
**類型**：決策調整 | 範圍收斂

## 決策原因

計畫功能增加複雜度但對商業目標貢獻有限，改以飲食法設定驅動商城推薦，記錄改為手動輸入和拍照。

## 變更內容

1. **商業邏輯閉環調整**：移除 AI 每日菜單與菜單打卡，改為「Onboarding 偏好 → 每日手動/拍照記錄 → Dashboard 趨勢追蹤 → 商城精準推薦 → 訂閱補貨」。
2. **Phase 2 重新規劃**：刪除 P2-1（AI 菜單 Queue）與 P2-2（`/plan`），改為 P2-1 飲食記錄、P2-2 拍照辨識、P2-3 Dashboard。
3. **頁面規格收斂**：移除 `/plan` 完整規格，Dashboard 查詢不再依賴 `daily_menus`，Onboarding 固定為 4 步驟。
4. **API 與 AI 任務收斂**：移除 `POST /api/ai/menu-request`、`ai-menu-generate`、`ai-menu-request`，Queue 僅保留拍照辨識與週報洞察。
5. **Cursor 規則同步**：專案閉環與 AI 任務分類更新為無菜單生成版本。

## 後續注意

- 任何新功能提案若涉及 `/plan`、菜單打卡或菜單生成，需先提出商業價值與複雜度評估再決定是否重啟。
