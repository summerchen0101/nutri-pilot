export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
};

const DEFAULT_INPUT_USD_PER_MTOK = 3;
const DEFAULT_OUTPUT_USD_PER_MTOK = 15;
const DEFAULT_AI_QUOTA_UNITS_PER_USD = 3000;

function envNumber(key: string, fallback: number): number {
  const v = Deno.env.get(key);
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function billingMonthTaipei(d: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  if (!y || !m) throw new Error('billingMonthTaipei: invalid Intl parts');
  return `${y}-${m}`;
}

function estimatedUsd(usage: TokenUsage | null): number {
  if (!usage) return 0;
  const inPerM = envNumber(
    'ANTHROPIC_INPUT_USD_PER_MTOK',
    DEFAULT_INPUT_USD_PER_MTOK,
  );
  const outPerM = envNumber(
    'ANTHROPIC_OUTPUT_USD_PER_MTOK',
    DEFAULT_OUTPUT_USD_PER_MTOK,
  );
  return (
    (usage.input_tokens / 1_000_000) * inPerM +
    (usage.output_tokens / 1_000_000) * outPerM
  );
}

/** 與 Next `lib/ai/token-usage-to-ai-quota.ts` 公式對齊。 */
export function tokensToAiQuotaUnits(usage: TokenUsage | null): number {
  const usd = estimatedUsd(usage);
  const unitsPerUsd = envNumber(
    'AI_QUOTA_UNITS_PER_USD',
    DEFAULT_AI_QUOTA_UNITS_PER_USD,
  );
  const units = usd * unitsPerUsd;
  return Math.round(units * 10_000) / 10_000;
}
