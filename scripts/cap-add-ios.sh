#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck source=scripts/load-env-local.sh
source "$(dirname "$0")/load-env-local.sh"

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods 未安裝。請先執行："
  echo "  ./scripts/install-cocoapods.sh"
  echo "或見 docs/mobile-capacitor.md「CocoaPods 安裝疑難」"
  exit 1
fi

if [[ -d ios/App ]]; then
  echo "ios/ 已存在，執行 cap sync ios"
  npx cap sync ios
  echo "完成。以 npm run cap:ios 開啟 Xcode。"
  exit 0
fi

if [[ -d ios ]]; then
  echo "偵測到未完成的 ios/（無 App/），將移除後重新 cap add ios…"
  rm -rf ios
fi

npx cap add ios
npx cap sync ios
echo "完成。以 npm run cap:ios 開啟 Xcode。"
echo "相機／Magic Link 設定請參考 docs/ios-Info.plist.example.xml"
