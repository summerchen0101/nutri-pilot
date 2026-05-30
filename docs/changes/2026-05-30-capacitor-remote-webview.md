# Capacitor 原生殼載入遠端 Next.js

**日期**：2026-05-30

**影響規格**：`docs/00-overview.md`（MVP 未列原生 App）

**異動摘要**：

- 新增 Capacitor 7（`com.nuts.nutriguard`），Android 平台與 `capacitor.config.ts` 以 `server.url` 載入 `NEXT_PUBLIC_APP_URL` 部署站，非靜態 export。
- Magic Link 改以 `buildAuthCallbackRedirectUrl` 固定 HTTPS 回調；`CapacitorAppListener` 處理 `nutriguard://` 與 App Links 冷啟動。
- 綠界 `navigateNamedPopup` 於原生 `window.open` 失敗時改 `@capacitor/browser`；週報分享原生 fallback 用 `@capacitor/share`。
- 文件：`docs/mobile-capacitor.md`；iOS 需本機 CocoaPods 後執行 `scripts/cap-add-ios.sh`。

**原因／後續**：保留 App Router SSR／Server Actions，避免數週靜態化重構。上架前須設定正式 HTTPS、Supabase Redirect、Android/iOS 深連結；iOS 專案於有 CocoaPods 的機器產生後 commit。
