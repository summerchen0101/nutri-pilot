#!/usr/bin/env bash
# 藍新 MPG 串接：Secrets 設定與 Edge Functions 部署
# 用法：
#   1. 在 .env.local 填入 NEWEBPAY_MERCHANT_ID / HASH_KEY / HASH_IV / APP_URL
#   2. set -a && source .env.local && set +a && ./scripts/newebpay-setup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v supabase >/dev/null 2>&1; then
  echo "請先安裝 Supabase CLI：https://supabase.com/docs/guides/cli"
  exit 1
fi

if [[ -f .env.local ]] && [[ -z "${NEWEBPAY_MERCHANT_ID:-}" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [[ -z "${NEWEBPAY_MERCHANT_ID:-}" ]]; then
  echo "請在 .env.local 設定 NEWEBPAY_MERCHANT_ID、NEWEBPAY_HASH_KEY、NEWEBPAY_HASH_IV"
  echo "然後：set -a && source .env.local && set +a && ./scripts/newebpay-setup.sh"
  exit 1
fi

: "${NEWEBPAY_HASH_KEY:?請設定 NEWEBPAY_HASH_KEY}"
: "${NEWEBPAY_HASH_IV:?請設定 NEWEBPAY_HASH_IV}"

NEWEBPAY_ENV="${NEWEBPAY_ENV:-test}"
APP_URL="${APP_URL:-${NEXT_PUBLIC_APP_URL:-}}"
if [[ -z "$APP_URL" ]]; then
  echo "請設定 APP_URL 或 NEXT_PUBLIC_APP_URL（ReturnURL 基底；正式環境須 https 且 80/443 埠）"
  exit 1
fi

echo "→ 設定 Supabase Edge Secrets…"
supabase secrets set \
  "NEWEBPAY_MERCHANT_ID=${NEWEBPAY_MERCHANT_ID}" \
  "NEWEBPAY_HASH_KEY=${NEWEBPAY_HASH_KEY}" \
  "NEWEBPAY_HASH_IV=${NEWEBPAY_HASH_IV}" \
  "NEWEBPAY_ENV=${NEWEBPAY_ENV}" \
  "APP_URL=${APP_URL}"

echo "→ 部署 Edge Functions…"
supabase functions deploy create-newebpay-payment
supabase functions deploy newebpay-notify
supabase functions deploy newebpay-query-trade

echo ""
echo "NotifyURL（請填入藍新會員專區 API 應用 URL，若需）："
echo "  https://<project-ref>.supabase.co/functions/v1/newebpay-notify"
echo ""
echo "藍新後台：會員中心 → 商店管理 → 商店資料設定 → 確認 CREDIT 已開通"
echo "完成。"
