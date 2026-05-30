# Capacitor 行動 App（nutri-pilot）

原生殼（iOS / Android）以 WebView 載入已部署的 Next.js HTTPS 站點，沿用 SSR、middleware、Server Actions 與綠界流程。

## 環境變數

| 變數 | 用途 |
|------|------|
| `NEXT_PUBLIC_APP_URL` | 正式網域（Magic Link、綠界 callback、Capacitor 預設載入網址） |
| `CAPACITOR_SERVER_URL` | 覆寫 WebView 載入網址（可選） |
| `CAPACITOR_DEV=1` | 開發模式 |
| `CAPACITOR_DEV_SERVER_URL` | 區網 `http://192.168.x.x:3000`（需 `next dev`） |

範例見 [`.env.local.example`](../.env.local.example)。

## Supabase Auth

Dashboard → Authentication → URL Configuration：

- **Site URL**：`https://<正式網域>`
- **Redirect URLs**：
  - `https://<正式網域>/auth/callback`
  - `http://localhost:3000/auth/callback`
  - `nutriguard://auth/callback`

登入表單使用 `NEXT_PUBLIC_APP_URL` 組 `emailRedirectTo`（見 `src/lib/capacitor/native-platform.ts`）。

## 開發流程

**重要**：修改 `.env.local` 的 Capacitor 網址後，必須執行 `npm run cap:sync`，再在 Xcode **重新 Run（Cmd+R）**。否則 Simulator 只會顯示 [`public/index.html`](../public/index.html) 離線提示頁。

`npm run cap:sync` 會自動 `source .env.local`；[`capacitor.config.ts`](../capacitor.config.ts) 亦會讀取同一檔案。

```bash
# 1. .env.local（Simulator 建議 127.0.0.1）
CAPACITOR_DEV=1
CAPACITOR_DEV_SERVER_URL=http://127.0.0.1:3000
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000

# 2. 啟動 Next（Simulator 用 yarn dev；實機同 Wi‑Fi 用 yarn dev:mobile + 192.168.x.x）
yarn dev

# 3. 同步並開啟原生 IDE
npm run cap:sync
npm run cap:ios
# Xcode → Cmd+R
```

sync 後可檢查 `ios/App/App/capacitor.config.json` 是否含 `"server": { "url": "http://127.0.0.1:3000", ... }`。

### `cap sync` 與 CocoaPods

- `npm run cap:sync` 執行 [`scripts/cap-sync.sh`](../scripts/cap-sync.sh)：一定同步 **Android**；僅在已建立 `ios/App` 且本機有 `pod` 時才同步 iOS。
- 若執行 `npm run cap:sync:all`（`npx cap sync`）且尚未裝 CocoaPods，CLI 會直接失敗——請改 `npm run cap:sync` 或 `npm run cap:sync:android`。
- 要做 iOS：先 `brew install cocoapods`，再 `npm run cap:ios:add`。

## 正式建置

1. 部署 Next.js，`NEXT_PUBLIC_APP_URL=https://<正式網域>`
2. 勿設 `CAPACITOR_DEV`；`capacitor.config.ts` 會以 `CAPACITOR_SERVER_URL` 或 `NEXT_PUBLIC_APP_URL` 作為 `server.url`
3. `npm run cap:sync`
4. Xcode Archive / Android Studio 產 AAB

## iOS 首次建立

需本機安裝 [CocoaPods](https://capacitorjs.com/docs/getting-started/environment-setup)：

```bash
npm run cap:install-cocoapods   # 或 ./scripts/install-cocoapods.sh
npm run cap:ios:add
npm run cap:ios
```

### CocoaPods 安裝疑難

**錯誤：`Cannot install on Intel processor in ARM default prefix (/opt/homebrew)`**

表示你是 **Intel Mac**，但終端機用的是裝在 `/opt/homebrew` 的 **Apple Silicon 版 Homebrew**，兩者不相容。

| 做法 | 說明 |
|------|------|
| **A. Intel Homebrew（建議）** | 安裝到 `/usr/local`，再 `brew install cocoapods`（見下方指令） |
| **B. 只做 Android** | `npm run cap:sync` + `npm run cap:android`，不需 CocoaPods |
| **C. Ruby 3 + gem** | 用 rbenv/asdf 裝 Ruby ≥ 3.1 後 `gem install cocoapods --user-install` |

Intel Mac 安裝 Homebrew（裝完後 `brew` 應在 `/usr/local/bin/brew`）：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/usr/local/bin/brew shellenv)"
brew install cocoapods
```

**系統 Ruby 2.6（macOS 內建）無法安裝新版 CocoaPods**，請勿只靠 `gem install`；優先使用 Homebrew 的 pod。

合併相機權限與 URL scheme：參考 [`docs/ios-Info.plist.example.xml`](ios-Info.plist.example.xml)。Universal Links 於 Xcode 設定 Associated Domains：`applinks:<正式網域>`。

若 `cap:ios:add` 出現 **ios platform already exists** 但沒有 `ios/App/`：執行 `rm -rf ios` 後再 `npm run cap:ios:add`（腳本已會自動處理僅含說明檔的 `ios/`）。

## Android

已含 `nutriguard://auth/callback` intent-filter 與相機／相簿權限。若啟用 https App Links，於正式網域放置 `/.well-known/assetlinks.json` 並在 `AndroidManifest.xml` 加上 `android:autoVerify` 的 https intent-filter（網域替換為實際值）。

## Simulator Magic Link 登入

信箱在 **Mac** 上，Simulator **收不到信**。Magic Link 使用 **PKCE**：必須在**同一個 App WebView** 內完成「寄信 → 開連結」，否則會出現「無法完成登入」。

**請勿使用** `xcrun simctl openurl`（常改開 **Safari**，沒有寄信時寫入的 PKCE cookie）。

`capacitor.config.ts` 的 `server.allowNavigation` 須包含 Supabase 網域（已從 `NEXT_PUBLIC_SUPABASE_URL` 自動帶入）。修改後執行 `npm run cap:sync` 並 Xcode **Cmd+R**，否則點「在 App 內開啟連結」仍可能跳 Safari。

建議流程：

1. 在 Nutri Guard App 登入頁輸入 Email → **寄送登入連結**（不要關 App）。
2. Mac 信箱 **複製** Magic Link 全文。
3. App 內「Simulator：貼上 Magic Link」欄位貼上 → **在 App 內開啟連結**。
4. 成功後應在 **App 內** 進入 `/dashboard`（無 Safari 底部工具列）；失敗則 **重新寄信**（連結只能用一次）。

若先看到「無法完成登入」、按返回登入卻進已登入畫面，且底部有 Safari 網址列：代表 session 在 **Safari**，與 App WebView 分開。請關 Safari，回 App 用「貼上 Magic Link」重做（已修正 dev 雙次兌換 code 的問題，需 `yarn dev` 熱更新或 Xcode 重 Run）。

Supabase Redirect URLs 須包含 `http://127.0.0.1:3000/auth/callback`，且 `yarn dev` 須在跑。

## 驗收（一般用戶區）

- 冷啟動載入正式站、未登入導向 `/login`
- Magic Link 完成 `/auth/callback`
- Log / Guard 拍照上傳
- Shop 綠界結帳（popup 失敗時會改開 InAppBrowser）
- 底部 nav safe area 正常

## 指令

| 指令 | 說明 |
|------|------|
| `npm run cap:sync` | 同步 web 資產與 plugin |
| `npm run cap:ios` | 開啟 Xcode |
| `npm run cap:android` | 開啟 Android Studio |
| `./scripts/cap-add-ios.sh` | 首次建立 `ios/` |
