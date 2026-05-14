import { redirect } from 'next/navigation';

import type { ShopProductRow } from '@/app/(main)/shop/shop-home-client';
import { ShopHomeClient } from '@/app/(main)/shop/shop-home-client';
import { ensureShopScores } from '@/app/(main)/shop/actions';
import { getCachedAuthContext } from '@/lib/auth';
import { getCachedUserProfileCoreRow } from '@/lib/user-profile';

function mapCatalogRow(
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
    variants: (p.variants as ShopProductRow['variants']) ?? [],
  };
}

export async function ShopCatalogBody() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  await ensureShopScores(user.id);

  const [
    { data: profile, error: profileErr },
    { data: goal },
    { data: scores },
    { data: catalog },
    { data: brandCounts },
    { data: favoriteRows },
  ] = await Promise.all([
    getCachedUserProfileCoreRow(supabase, user.id),
    supabase
      .from('user_goals')
      .select('type')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('user_product_scores')
      .select('product_id, score')
      .eq('user_id', user.id),
    supabase
      .from('products')
      .select(
        `
      id,
      name,
      slug,
      image_url,
      category,
      calories,
      protein_g,
      sugar_g,
      diet_tags,
      cert_tags,
      avg_rating,
      brand:brands (
        id, name, slug, logo_url,
        vendor:vendors!inner (
          id,
          name,
          shipping_fee,
          free_shipping_threshold,
          lead_time_days
        )
      ),
      variants:product_variants ( id, label, price, stock )
    `,
      )
      .eq('is_active', true),
    supabase.from('products').select('brand_id').eq('is_active', true),
    supabase
      .from('user_product_favorites')
      .select('product_id')
      .eq('user_id', user.id),
  ]);

  if (profileErr || !profile || !goal || !profile.diet_method) {
    redirect('/onboarding');
  }

  const scoreMap = new Map(
    (scores ?? []).map((s) => [s.product_id as string, Number(s.score)]),
  );

  const brandCountMap = new Map<string, number>();
  for (const row of brandCounts ?? []) {
    const bid = row.brand_id as string;
    brandCountMap.set(bid, (brandCountMap.get(bid) ?? 0) + 1);
  }

  const { data: brands } = await supabase
    .from('brands')
    .select('id, name, slug, logo_url')
    .eq('is_active', true)
    .order('name');

  const favoriteProductIds = (favoriteRows ?? []).map(
    (r) => r.product_id as string,
  );

  return (
    <ShopHomeClient
      initialFavoriteProductIds={favoriteProductIds}
      initialProducts={(catalog ?? []).map((p) =>
        mapCatalogRow(p as Record<string, unknown>, scoreMap.get(p.id as string) ?? 0),
      )}
      brands={(brands ?? []).map((b) => ({
        ...b,
        productCount: brandCountMap.get(b.id as string) ?? 0,
      }))}
      dietMethod={profile.diet_method}
      usePersonalizedScores={profile.shop_personalize_recommendations !== false}
    />
  );
}
