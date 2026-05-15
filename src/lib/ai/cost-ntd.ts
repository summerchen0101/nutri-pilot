export type ClaudeTokenUsage = {
  input_tokens: number;
  output_tokens: number;
};

const DEFAULT_INPUT_USD_PER_MTOK = 3;
const DEFAULT_OUTPUT_USD_PER_MTOK = 15;
const DEFAULT_USD_TWD_RATE = 32;

function envNumber(key: string, fallback: number): number {
  const v = process.env[key];
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * 以每百萬 token 美元單價與匯率估算台幣成本（與 Edge `_shared/ai-cost-ntd` 公式對齊）。
 * 環境變數：ANTHROPIC_INPUT_USD_PER_MTOK、ANTHROPIC_OUTPUT_USD_PER_MTOK、USD_TWD_RATE
 */
export function tokensToCostNtd(usage: ClaudeTokenUsage | null): number {
  if (!usage) return 0;
  const inPerM = envNumber(
    'ANTHROPIC_INPUT_USD_PER_MTOK',
    DEFAULT_INPUT_USD_PER_MTOK,
  );
  const outPerM = envNumber(
    'ANTHROPIC_OUTPUT_USD_PER_MTOK',
    DEFAULT_OUTPUT_USD_PER_MTOK,
  );
  const usdTwd = envNumber('USD_TWD_RATE', DEFAULT_USD_TWD_RATE);
  const usd =
    (usage.input_tokens / 1_000_000) * inPerM +
    (usage.output_tokens / 1_000_000) * outPerM;
  const ntd = usd * usdTwd;
  return Math.round(ntd * 10_000) / 10_000;
}
