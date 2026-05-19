import { formatAdditiveCatalogBody } from '@/lib/food/label-guard-additive-catalog';
import type { LabelGuardLabelNames } from '@/lib/food/label-guard-report';

const UNREADABLE_PACKAGE_BODY =
  '本次影像未能辨識具體成分名稱，請以包裝原文為準。';

export function normalizeMatchKey(s: string): string {
  return s
    .trim()
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/／/g, '/');
}

export function findLabelNamesForKey(
  matchKey: string,
  details: LabelGuardLabelNames[] | undefined,
): string[] | null {
  if (!details || details.length === 0) return null;

  const n = normalizeMatchKey(matchKey);
  if (!n) return null;

  for (const row of details) {
    if (normalizeMatchKey(row.match_key) === n) {
      return row.label_names;
    }
  }

  let best: LabelGuardLabelNames | null = null;
  let bestLen = 0;
  for (const row of details) {
    const nk = normalizeMatchKey(row.match_key);
    if (!nk) continue;
    if (n.includes(nk) || nk.includes(n)) {
      if (nk.length > bestLen) {
        bestLen = nk.length;
        best = row;
      }
    }
  }

  return best ? best.label_names : null;
}

export function hasPackageLabelDetail(
  matchKey: string,
  details: LabelGuardLabelNames[] | undefined,
): boolean {
  return findLabelNamesForKey(matchKey, details) !== null;
}

export function formatPackageLabelNamesSheet(params: {
  title: string;
  labelNames: string[];
  generalBody?: string;
}): { title: string; body: string } {
  return formatAdditiveDetailSheet({
    title: params.title,
    labelNames: params.labelNames,
    generalBody: params.generalBody,
    includePackageSection: true,
  });
}

/** 警示／風險／info 彈窗：本次標示 + 常見成分條列 + 可選一般參考 */
export function formatAdditiveDetailSheet(params: {
  title: string;
  labelNames?: string[];
  generalBody?: string;
  /** false 時僅顯示 catalog（chip 一般說明） */
  includePackageSection?: boolean;
}): { title: string; body: string } {
  const title = params.includePackageSection
    ? `${params.title.trim()}（本次標示）`
    : params.title.trim();
  const lines: string[] = [];
  const labelNames = params.labelNames ?? [];

  if (params.includePackageSection) {
    lines.push('【本次標示】');
    if (labelNames.length > 0) {
      for (const name of labelNames) {
        lines.push(`・${name}`);
      }
    } else {
      lines.push(UNREADABLE_PACKAGE_BODY);
    }
  }

  const catalogBody = formatAdditiveCatalogBody(params.title);
  if (catalogBody) {
    if (lines.length > 0) lines.push('');
    lines.push('【此類常見成分說明】');
    lines.push(catalogBody);
  }

  const general = params.generalBody?.trim();
  if (general && general !== catalogBody) {
    lines.push('');
    lines.push('【一般性參考】');
    lines.push(general);
  }

  if (lines.length === 0) {
    return {
      title: params.title.trim(),
      body: catalogBody ?? UNREADABLE_PACKAGE_BODY,
    };
  }

  return { title, body: lines.join('\n') };
}

export function formatAllergenPackageSheet(params: {
  allergenTitle: string;
  labelNames: string[];
  detectedDetail: string | null;
  generalBody: string;
}): { title: string; body: string } {
  const { title, body } = formatPackageLabelNamesSheet({
    title: params.allergenTitle,
    labelNames: params.labelNames,
    generalBody: params.generalBody,
  });

  const d = params.detectedDetail?.trim();
  if (!d) return { title, body };

  return {
    title,
    body: `${body}\n\n【本次判讀】\n${d}`,
  };
}
