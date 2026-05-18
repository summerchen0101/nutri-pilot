import { randomUUID } from 'crypto';

export function makeUniqueSlugBase(name: string): string {
  const slugPart = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 48);
  const suffix = randomUUID().replace(/-/g, '').slice(0, 10);
  return slugPart ? `${slugPart}-${suffix}` : `product-${suffix}`;
}

export function makeBrandSlugBase(name: string): string {
  return makeUniqueSlugBase(name).replace(/^product-/, 'brand-');
}
