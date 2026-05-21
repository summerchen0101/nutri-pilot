#!/usr/bin/env bash
# 綠界金流＋物流 C2C：Secrets 設定與 Edge Functions 部署
# 用法：
#   1. 在 .env.local 填入 ECPAY_* / APP_URL（見 .env.local.example）
#   2. set -a && source .env.local && set +a && ./scripts/ecpay-setup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v supabase >/dev/null 2>&1; then
  echo "請先安裝 Supabase CLI：https://supabase.com/docs/guides/cli"
  exit 1
fi

if [[ -f .env.local ]] && [[ -z "${ECPAY_MERCHANT_ID:-}" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

ECPAY_STAGE="${ECPAY_STAGE:-true}"
APP_URL="${APP_URL:-${NEXT_PUBLIC_APP_URL:-}}"
if [[ -z "$APP_URL" ]]; then
  echo "請設定 APP_URL 或 NEXT_PUBLIC_APP_URL（callback 基底；正式環境須 https）"
  exit 1
fi

: "${ECPAY_LOGISTICS_SENDER_CELLPHONE:?請在 .env.local 設定 ECPAY_LOGISTICS_SENDER_CELLPHONE}"
: "${ECPAY_LOGISTICS_SENDER_ZIP_CODE:?請在 .env.local 設定 ECPAY_LOGISTICS_SENDER_ZIP_CODE}"
: "${ECPAY_LOGISTICS_SENDER_ADDRESS:?請在 .env.local 設定 ECPAY_LOGISTICS_SENDER_ADDRESS}"

ECPAY_LOGISTICS_SENDER_NAME="${ECPAY_LOGISTICS_SENDER_NAME:-NutriPilot}"

echo "→ 設定 Supabase Edge Secrets…"
ARGS=(
  "ECPAY_STAGE=${ECPAY_STAGE}"
  "APP_URL=${APP_URL}"
)

if [[ -n "${ECPAY_MERCHANT_ID:-}" ]]; then
  ARGS+=("ECPAY_MERCHANT_ID=${ECPAY_MERCHANT_ID}")
fi
if [[ -n "${ECPAY_HASH_KEY:-}" ]]; then
  ARGS+=("ECPAY_HASH_KEY=${ECPAY_HASH_KEY}")
fi
if [[ -n "${ECPAY_HASH_IV:-}" ]]; then
  ARGS+=("ECPAY_HASH_IV=${ECPAY_HASH_IV}")
fi
if [[ -n "${ECPAY_LOGISTICS_MERCHANT_ID:-}" ]]; then
  ARGS+=("ECPAY_LOGISTICS_MERCHANT_ID=${ECPAY_LOGISTICS_MERCHANT_ID}")
fi
if [[ -n "${ECPAY_LOGISTICS_HASH_KEY:-}" ]]; then
  ARGS+=("ECPAY_LOGISTICS_HASH_KEY=${ECPAY_LOGISTICS_HASH_KEY}")
fi
if [[ -n "${ECPAY_LOGISTICS_HASH_IV:-}" ]]; then
  ARGS+=("ECPAY_LOGISTICS_HASH_IV=${ECPAY_LOGISTICS_HASH_IV}")
fi
ARGS+=(
  "ECPAY_LOGISTICS_SENDER_NAME=${ECPAY_LOGISTICS_SENDER_NAME}"
  "ECPAY_LOGISTICS_SENDER_CELLPHONE=${ECPAY_LOGISTICS_SENDER_CELLPHONE}"
  "ECPAY_LOGISTICS_SENDER_ZIP_CODE=${ECPAY_LOGISTICS_SENDER_ZIP_CODE}"
  "ECPAY_LOGISTICS_SENDER_ADDRESS=${ECPAY_LOGISTICS_SENDER_ADDRESS}"
)

supabase secrets set "${ARGS[@]}"

FUNCS=(
  create-shop-order
  ecpay-logistics-selection
  ecpay-logistics-client-return
  ecpay-logistics-return
  ecpay-checkout
  ecpay-return
  ecpay-payment-info
  ecpay-order-result
  ecpay-query-trade
  ecpay-logistics-print
)

echo "→ 部署 Edge Functions…"
for fn in "${FUNCS[@]}"; do
  supabase functions deploy "$fn"
done

echo ""
echo "綠界後台請設定（HTTPS）："
echo "  ReturnURL:       https://<project-ref>.supabase.co/functions/v1/ecpay-return"
echo "  OrderResultURL:  https://<project-ref>.supabase.co/functions/v1/ecpay-order-result?appOrigin=<APP_URL>"
echo "  PaymentInfoURL:  https://<project-ref>.supabase.co/functions/v1/ecpay-payment-info"
echo "  ServerReplyURL:  https://<project-ref>.supabase.co/functions/v1/ecpay-logistics-return"
echo ""
echo "測試金流 MerchantID=2000132；物流 C2C MerchantID=2000933（不可混用 key）"
echo "完成。"
