export type ClaudeTokenUsage = {
  input_tokens: number;
  output_tokens: number;
};

const DEFAULT_INPUT_USD_PER_MTOK = 3;
const DEFAULT_OUTPUT_USD_PER_MTOK = 15;
const DEFAULT_AI_QUOTA_UNITS_PER_USD = 3000;

function envNumber(key: string, fallback: number): number {
  const v = process.env[key];
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** 以每百萬 token 美元單價估算 API 成本（美金）。 */
function estimatedUsd(usage: ClaudeTokenUsage | null): number {
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

/**
 * 美元成本換算為 AI 額度；預設 1 美金 = 3000 AI 額度。
 * 環境變數：ANTHROPIC_*、`AI_QUOTA_UNITS_PER_USD`
 */
export function tokensToAiQuotaUnits(usage: ClaudeTokenUsage | null): number {
  const usd = estimatedUsd(usage);
  const unitsPerUsd = envNumber(
    'AI_QUOTA_UNITS_PER_USD',
    DEFAULT_AI_QUOTA_UNITS_PER_USD,
  );
  const units = usd * unitsPerUsd;
  return Math.round(units * 10_000) / 10_000;
}
