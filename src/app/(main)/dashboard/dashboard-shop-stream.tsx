import {
  RecommendationRail,
  WeeklyPopularBrandsRail,
} from '@/app/(main)/dashboard/dashboard-home';
import {
  buildRecommendedProducts,
  pickRandomBrands,
} from '@/app/(main)/dashboard/dashboard-helpers';
import { getCachedAuthContext } from '@/lib/auth';

export async function DashboardRecommendedProductsDeferred({
  dietMethod,
  dietMethodLabel,
  usePersonalizedScores = true,
}: {
  dietMethod: string | null;
  dietMethodLabel: string;
  usePersonalizedScores?: boolean;
}) {
  const { supabase, user } = await getCachedAuthContext();
  if (!user) return null;

  const [{ data: productScores }, { data: productCatalog }] = await Promise.all([
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
      image_url,
      protein_g,
      sugar_g,
      diet_tags,
      cert_tags,
      avg_rating,
      variants:product_variants ( price )
    `,
      )
      .eq('is_active', true),
  ]);

  const recommendationProducts = buildRecommendedProducts({
    products: productCatalog ?? [],
    scores: productScores ?? [],
    dietMethod,
    usePersonalizedScores,
  }).map((row) => ({
    ...row,
    reason: row.reason ?? `符合${dietMethodLabel}偏好`,
  }));

  if (recommendationProducts.length === 0) return null;

  return <RecommendationRail products={recommendationProducts} />;
}

export async function DashboardPopularBrandsDeferred() {
  const { supabase, user } = await getCachedAuthContext();
  if (!user) return null;

  const [{ data: brandProductRows }, { data: brandRows }] = await Promise.all([
    supabase.from('products').select('brand_id').eq('is_active', true),
    supabase
      .from('brands')
      .select('id, name, slug, logo_url')
      .eq('is_active', true),
  ]);

  const activeBrandCounts = new Map<string, number>();
  for (const row of brandProductRows ?? []) {
    const brandId = row.brand_id as string | null;
    if (!brandId) continue;
    activeBrandCounts.set(brandId, (activeBrandCounts.get(brandId) ?? 0) + 1);
  }
  const popularBrands = pickRandomBrands(
    (brandRows ?? []).filter((row) => activeBrandCounts.has(row.id as string)),
    8,
  );

  const brands = popularBrands.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    logoUrl: row.logo_url as string | null,
  }));

  if (brands.length === 0) return null;

  return <WeeklyPopularBrandsRail brands={brands} />;
}
