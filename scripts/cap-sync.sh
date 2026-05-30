#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck source=scripts/load-env-local.sh
source "$(dirname "$0")/load-env-local.sh"

echo "→ sync android"
npx cap sync android

if [[ ! -d ios/App ]]; then
  echo "→ 略過 ios（尚未建立，可執行 npm run cap:ios:add）"
  exit 0
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "→ 略過 ios sync：未安裝 CocoaPods（brew install cocoapods）"
  exit 0
fi

echo "→ sync ios"
npx cap sync ios

echo "→ 完成。請在 Xcode 重新 Run（Cmd+R）"
