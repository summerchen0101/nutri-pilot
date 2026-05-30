#!/usr/bin/env bash
# 供 cap sync 載入與 Next 相同的 .env.local（Capacitor CLI 預設不會讀）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env.local"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "→ 未找到 .env.local，cap sync 將不帶 server.url（除非已 export 環境變數）"
  return 0 2>/dev/null || exit 0
fi

set -a
# shellcheck disable=SC1091
source "${ENV_FILE}"
set +a

if [[ "${CAPACITOR_DEV:-}" == "1" && -n "${CAPACITOR_DEV_SERVER_URL:-}" ]]; then
  echo "→ Capacitor dev server: ${CAPACITOR_DEV_SERVER_URL}"
elif [[ -n "${CAPACITOR_SERVER_URL:-}" ]]; then
  echo "→ Capacitor server: ${CAPACITOR_SERVER_URL}"
elif [[ -n "${NEXT_PUBLIC_APP_URL:-}" ]]; then
  echo "→ Capacitor server (NEXT_PUBLIC_APP_URL): ${NEXT_PUBLIC_APP_URL}"
else
  echo "→ 警告：未設定 CAPACITOR_DEV_SERVER_URL / NEXT_PUBLIC_APP_URL，sync 後可能只顯示離線頁"
fi
