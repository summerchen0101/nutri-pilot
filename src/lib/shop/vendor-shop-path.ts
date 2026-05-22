export function buildVendorShopHref(slug: string): string {
  return `/shop/vendors/${encodeURIComponent(slug.trim())}`;
}
