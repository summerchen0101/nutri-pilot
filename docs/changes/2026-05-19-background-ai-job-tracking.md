# 記錄／守衛頁 AI 分析可離開頁面持續

**日期**：2026-05-19  
**影響規格**：docs/06-pages.md（`/log` 拍照、`/guard` 標示）

## 異動摘要

- 拍照／標示分析 job 狀態改由 `(main)` 層 `pending-analysis-jobs-store` + `PendingAnalysisJobsHost` 追蹤（Realtime + 輪詢），離開 `/log`、`/guard` 仍持續至 `ready`／`error`。
- 分析完成且使用者不在原頁時，以既有 `AppMessageDialog` toast 提示；回到原頁還原等待中或結果 UI，預覽圖以 `storage_path` 簽名 URL 補回。
- `sessionStorage` 僅 persist job 識別與 context，整頁重新整理後向 DB hydrate。
- 手動文字 AI（`/api/ai/analyze-food`）未改，仍為同步請求。

## 原因／後續

- 後端 QStash 本來就會跑完，先前 UI 綁在頁面元件導致離開即停止 poll。
- 可選後續：bottom nav 進行中角標；手動 AI 若需背景化需另開 Queue。
