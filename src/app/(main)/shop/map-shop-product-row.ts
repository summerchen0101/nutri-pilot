import type { ShopProductRow } from '@/app/(main)/shop/shop-home-client';

function normalizeShopVariants(raw: unknown): ShopProductRow['variants'] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const v = item as Record<string, unknown>;
    const listRaw = v.list_price;
    return {
      id: String(v.id),
      label: String(v.label),
      price: Number(v.price),
      stock: v.stock == null ? null : Number(v.stock),
      list_price: (() => {
        if (listRaw == null) return null;
        const n = Number(listRaw);
        return Number.isFinite(n) ? n : null;
      })(),
    };
  });
}

/**
 * Maps a Supabase `products` row (with embedded `brand`, `variants`) into {@link ShopProductRow}.
 */
export function mapSupabaseProductToShopRow(
  p: Record<string, unknown>,
  score: number,
): ShopProductRow {
  const brandRaw = p.brand as Record<string, unknown> | null | undefined;
  let brand: ShopProductRow['brand'] = null;
  if (brandRaw && typeof brandRaw === 'object') {
    const vr = brandRaw.vendor as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined;
    const v = Array.isArray(vr) ? vr[0] : vr;
    if (v && typeof v === 'object') {
      brand = {
        id: String(brandRaw.id),
        name: String(brandRaw.name),
        slug: String(brandRaw.slug),
        logo_url: (brandRaw.logo_url as string | null) ?? null,
        vendor: {
          id: String(v.id),
          name: String(v.name),
          shipping_fee: Number(v.shipping_fee),
          free_shipping_threshold:
            v.free_shipping_threshold == null ?
              null
            : Number(v.free_shipping_threshold),
          lead_time_days: Number(v.lead_time_days ?? 3),
        },
      };
    }
  }

  return {
    id: String(p.id),
    name: String(p.name),
    slug: String(p.slug),
    image_url: (p.image_url as string | null) ?? null,
    category: String(p.category),
    calories: Number(p.calories),
    protein_g: Number(p.protein_g),
    sugar_g: p.sugar_g == null ? null : Number(p.sugar_g),
    diet_tags: (p.diet_tags as string[] | null) ?? null,
    cert_tags: (p.cert_tags as string[] | null) ?? null,
    avg_rating: p.avg_rating == null ? null : Number(p.avg_rating),
    score,
    brand,
    variants: normalizeShopVariants(p.variants),
  };
}
