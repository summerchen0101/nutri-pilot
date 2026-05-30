# 過往紀錄全量列表與近 3 日可修改

**日期**：2026-05-26

**影響規格**：`docs/06-pages.md`（`/log`）、`docs/changes/2026-05-20-log-history-pages.md`

**異動摘要**：

- `/log/history` 改為查詢使用者全部有資料的日期（至今日止），不再以 `user_profiles.updated_at` 為下限。
- 可修改窗口：今日＋過去 3 個日曆日（不含今天計入「3 日」）；第 4 天以前唯讀。政策集中於 `lib/log/log-date-policy.ts`（`recent_editable` 取代 `yesterday_editable`）。
- 列表 CTA：近 3 日內（不含今日）與昨日相同導向 `/log?date=`；更早為「查看」→ `/log/history/[date]`。
- Server Actions 錯誤文案改為「僅能修改今日或近 3 日的紀錄」。

**原因／後續**：產品要求可看完整歷史、補登窗口放寬至 3 日。Supabase 預設每查詢 1000 列，重度使用者若需完整列表可後續加分頁或 RPC 去重日期。可視需要更新 `docs/06-pages.md` 路由表。
