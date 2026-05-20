import { DIET_TAG_OPTIONS } from '@/lib/admin/product-taxonomy';

const LABEL_BY_VALUE = Object.fromEntries(
  DIET_TAG_OPTIONS.map((o) => [o.value, o.label]),
) as Record<string, string>;

export function getDietTagLabel(value: string): string {
  return LABEL_BY_VALUE[value] ?? value;
}
