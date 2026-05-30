#!/usr/bin/env bash
set -euo pipefail

if command -v pod >/dev/null 2>&1; then
  echo "CocoaPods 已安裝：$(command -v pod)"
  pod --version
  exit 0
fi

ARCH="$(uname -m)"
BREW="$(command -v brew 2>/dev/null || true)"

echo "CPU: ${ARCH}"
echo "brew: ${BREW:-（未找到）}"

# Intel Mac 卻使用 /opt/homebrew（ARM 前綴）→ brew install 會失敗
if [[ "${ARCH}" == "x86_64" && "${BREW}" == /opt/homebrew/bin/brew ]]; then
  echo ""
  echo "偵測到 Intel Mac，但 Homebrew 在 /opt/homebrew（僅適用 Apple Silicon）。"
  echo "因此「brew install cocoapods」會出現："
  echo "  Cannot install on Intel processor in ARM default prefix"
  echo ""
  echo "請擇一處理："
  echo ""
  echo "【A】安裝 Intel 版 Homebrew（建議，路徑 /usr/local）"
  echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  echo "  echo 'eval \"\$(/usr/local/bin/brew shellenv)\"' >> ~/.zprofile"
  echo "  eval \"\$(/usr/local/bin/brew shellenv)\""
  echo "  brew install cocoapods"
  echo ""
  echo "【B】暫只做 Android（不需 CocoaPods）"
  echo "  npm run cap:sync"
  echo "  npm run cap:android"
  echo ""
  echo "【C】已有 Ruby 3+ 時可用 gem"
  echo "  gem install cocoapods --user-install"
  echo "  export PATH=\"\$HOME/.gem/ruby/\$(ruby -e 'print RUBY_VERSION[/\\d+\\.\\d+/]')/bin:\$PATH\""
  exit 1
fi

if [[ -x /usr/local/bin/brew ]]; then
  echo "使用 Intel Homebrew 安裝 cocoapods…"
  /usr/local/bin/brew install cocoapods
  exit 0
fi

if [[ -x /opt/homebrew/bin/brew && "${ARCH}" == "arm64" ]]; then
  echo "使用 Apple Silicon Homebrew 安裝 cocoapods…"
  /opt/homebrew/bin/brew install cocoapods
  exit 0
fi

echo "找不到適用的 Homebrew。請見 docs/mobile-capacitor.md「CocoaPods 安裝疑難」。"
exit 1
