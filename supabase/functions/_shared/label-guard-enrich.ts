/**
 * 標示守衛報告後處理；須與 src/lib/food/label-guard-enrich.ts 同步。
 */

export const HIGH_SODIUM_THRESHOLD_MG = 600;

export const DAILY_SODIUM_REF_MG = 2400;

export const MAX_ALERT_KEYWORDS = 12;

const HIGH_SODIUM_ALERT_TERMS = ["高鈉", "高鈉含量", "鈉含量偏高", "鈉偏高"] as const;

export const ADDITIVE_ALERT_ALIASES = [
  "膨鬆劑",
  "調味劑",
  "增色劑",
  "著色劑",
  "防腐劑",
  "乳化劑",
  "增稠劑",
  "酸度調節劑",
  "抗氧化劑",
  "漂白劑",
  "品質改良劑",
  "甜味劑",
  "食品添加物",
  "碳酸氫鈉",
  "小蘇打",
  "焦磷酸二鈉",
  "檸檬黃",
  "日落黃",
  "紅色40號",
  "胭脂紅",
  "苯甲酸鈉",
  "己二烯酸",
  "己二烯酸鉀",
  "去水醋酸",
  "阿斯巴甜",
  "蔗糖素",
  "糖精",
  "卡拉膠",
  "味精",
  "MSG",
  "人工色素",
  "人工甜味劑",
] as const;

const HIGH_SODIUM_RISK_PLAIN =
  "鈉含量偏高，可能增加血壓與心血管負擔；高血壓、腎臟疾病或限鈉者宜留意份量，並搭配整日飲食評估。";

function normalizeForMatch(s: string): string {
  return s
    .trim()
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/／/g, "/");
}

function hasHighSodiumAlertKeyword(keywords: string[]): boolean {
  return keywords.some((kw) => {
    const n = normalizeForMatch(kw);
    return HIGH_SODIUM_ALERT_TERMS.some(
      (term) => n.includes(normalizeForMatch(term)),
    );
  });
}

function collectReportTextFragments(obj: Record<string, unknown>): string {
  const parts: string[] = [];

  const summary = obj.summary_note;
  if (typeof summary === "string") parts.push(summary);

  const rawKw = obj.alert_keywords;
  if (Array.isArray(rawKw)) {
    for (const x of rawKw) {
      if (typeof x === "string") parts.push(x);
    }
  }

  const rawRisk = obj.risk_items;
  if (Array.isArray(rawRisk)) {
    for (const row of rawRisk) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (typeof r.name === "string") parts.push(r.name);
      if (typeof r.plain_language === "string") parts.push(r.plain_language);
    }
  }

  return parts.join("\n");
}

export function extractMaxSodiumMgFromText(text: string): number | null {
  const normalized = text.replace(/，/g, ",").replace(/：/g, ":");
  let max: number | null = null;

  const patterns = [
    /鈉[^0-9]{0,24}?[≥>]?\s*(\d{2,5})\s*(?:mg|毫克)/gi,
    /[≥>]?\s*(\d{2,5})\s*(?:mg|毫克)[^0-9]{0,24}?鈉/gi,
    /每\s*(?:100\s*)?(?:g|克|ml|毫升)[^0-9]{0,40}?鈉[^0-9]{0,16}?(\d{2,5})/gi,
    /每份[^0-9]{0,40}?鈉[^0-9]{0,16}?(\d{2,5})/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((match = re.exec(normalized)) !== null) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > 0) {
        if (max === null || n > max) max = n;
      }
    }
  }

  return max;
}

function shouldFlagHighSodium(text: string): boolean {
  const n = normalizeForMatch(text);
  if (
    HIGH_SODIUM_ALERT_TERMS.some((term) => n.includes(normalizeForMatch(term)))
  ) {
    return true;
  }
  const maxMg = extractMaxSodiumMgFromText(text);
  return maxMg !== null && maxMg >= HIGH_SODIUM_THRESHOLD_MG;
}

function hasRiskItemNamed(riskItems: unknown[], name: string): boolean {
  const target = normalizeForMatch(name);
  return riskItems.some((row) => {
    if (!row || typeof row !== "object") return false;
    const r = row as Record<string, unknown>;
    return normalizeForMatch(String(r.name ?? "")) === target;
  });
}

function pushAlertKeyword(keywords: string[], term: string): void {
  const trimmed = term.trim();
  if (!trimmed) return;
  if (keywords.length >= MAX_ALERT_KEYWORDS) return;
  const n = normalizeForMatch(trimmed);
  const exists = keywords.some((kw) => normalizeForMatch(kw) === n);
  if (!exists) keywords.push(trimmed.slice(0, 80));
}

function matchAdditiveAlias(text: string): string | null {
  const n = normalizeForMatch(text);
  let best: { len: number; term: string } | null = null;
  for (const term of ADDITIVE_ALERT_ALIASES) {
    const nt = normalizeForMatch(term);
    if (!nt) continue;
    if (n.includes(nt) || nt.includes(n)) {
      const len = nt.length;
      if (!best || len > best.len) best = { len, term };
    }
  }
  return best?.term ?? null;
}

function clampScore(n: unknown): number {
  const v = Math.round(Number(n));
  if (Number.isNaN(v)) return 70;
  return Math.max(0, Math.min(100, v));
}

export function enrichLabelGuardReport(obj: Record<string, unknown>): void {
  const alertKeywords: string[] = [];
  const rawKw = obj.alert_keywords;
  if (Array.isArray(rawKw)) {
    for (const x of rawKw) {
      const s = String(x ?? "").trim();
      if (s) alertKeywords.push(s.slice(0, 80));
    }
  }
  obj.alert_keywords = alertKeywords;

  const riskItems: Record<string, unknown>[] = [];
  const rawRisk = obj.risk_items;
  if (Array.isArray(rawRisk)) {
    for (const row of rawRisk) {
      if (!row || typeof row !== "object") continue;
      riskItems.push(row as Record<string, unknown>);
    }
  }
  obj.risk_items = riskItems;

  const reportText = collectReportTextFragments(obj);
  let scorePenalty = 0;

  if (shouldFlagHighSodium(reportText) && !hasHighSodiumAlertKeyword(alertKeywords)) {
    pushAlertKeyword(alertKeywords, "高鈉");
    if (!hasRiskItemNamed(riskItems, "高鈉")) {
      const maxMg = extractMaxSodiumMgFromText(reportText);
      const plain =
        maxMg !== null
          ? `標示鈉約 ${maxMg}mg，達偏高參考（≥${HIGH_SODIUM_THRESHOLD_MG}mg）；一般成人一日參考約 ${DAILY_SODIUM_REF_MG}mg，高血壓或限鈉者宜控份量。`
          : HIGH_SODIUM_RISK_PLAIN;
      riskItems.push({
        name: "高鈉",
        tier: "watch",
        plain_language: plain.slice(0, 400),
      });
    }
  }

  for (const row of riskItems) {
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    const alias = matchAdditiveAlias(name);
    if (alias) pushAlertKeyword(alertKeywords, alias);
    const plain = String(row.plain_language ?? "");
    const plainAlias = matchAdditiveAlias(plain);
    if (plainAlias) pushAlertKeyword(alertKeywords, plainAlias);
    if (row.tier === "high") scorePenalty = Math.max(scorePenalty, 5);
  }

  obj.alert_keywords = alertKeywords.slice(0, MAX_ALERT_KEYWORDS);
  obj.risk_items = riskItems;

  if (scorePenalty > 0) {
    obj.safety_score = clampScore(Number(obj.safety_score) - scorePenalty);
  }
}
