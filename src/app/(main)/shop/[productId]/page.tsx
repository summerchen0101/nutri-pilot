import { notFound, redirect } from 'next/navigation';

import { ProductDetailMaraisClient } from '@/app/(main)/shop/[productId]/product-detail-marais-client';
import { ShopProductDetailHeaderActions } from '@/app/(main)/shop/[productId]/shop-product-detail-header-actions';
import { ShopHeaderPointsTitle } from '@/app/(main)/shop/_components/shop-header-points-title';
import { HeaderBackButton } from '@/components/layout/header-back-button';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from '@/lib/shop/constants';
import { generateFitReasons } from '@/lib/shop/fit-reasons';
import { getCachedAuthContext } from '@/lib/auth';

function parseAnalyticsSource(raw: string | string[] | undefined): string {
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  if (
    Array.isArray(raw)
    && raw.length > 0
    && typeof raw[0] === 'string'
    && raw[0].trim().length > 0
  )
    return raw[0].trim();
  return 'recommendation';
}

interface PageProps {
  params: { productId: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function ShopProductPage({ params, searchParams }: PageProps) {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: goal }] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("user_id", user.id).single(),
    supabase
      .from("user_goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (!profile || !goal || !profile.diet_method) redirect("/onboarding");

  const { data: product, error } = await supabase
    .from('products')
    .select(
      `
      *,
      brand:brands (
        id, name, slug, description, logo_url,
        vendor:vendors!inner (
          id,
          name,
          slug,
          shipping_fee,
          free_shipping_threshold,
          lead_time_days
        )
      ),
      variants:product_variants ( id, label, weight_g, price, stock, list_price )
    `,
    )
    .eq('id', params.productId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !product) notFound();

  const { data: favoriteRow } = await supabase
    .from("user_product_favorites")
    .select("product_id")
    .eq("user_id", user.id)
    .eq("product_id", product.id as string)
    .maybeSingle();

  const { data: categoryRow } = await supabase
    .from('shop_categories')
    .select('label')
    .eq('slug', product.category as string)
    .maybeSingle();

  const categoryLabel = categoryRow?.label ?? (product.category as string);

  const fitReasons = generateFitReasons(
    {
      diet_tags: product.diet_tags,
      ingredients: product.ingredients,
      allergen_free: product.allergen_free,
      calories: Number(product.calories),
      protein_g: Number(product.protein_g),
      sugar_g: product.sugar_g != null ? Number(product.sugar_g) : null,
    },
    {
      avoid_foods: profile.avoid_foods ?? [],
      allergens: profile.allergens ?? [],
    },
    {
      type: goal.type as "lose_weight" | "gain_muscle" | "maintain",
    },
    { diet_method: profile.diet_method },
  );

  const analyticsClickSource = parseAnalyticsSource(searchParams?.source);

  const { count: brandProductCountRaw } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', product.brand_id as string)
    .eq('is_active', true);

  const brandProductCount = brandProductCountRaw ?? 0;

  const { data: sameBrand } = await supabase
    .from("products")
    .select("id, name, image_url, slug, variants:product_variants(price)")
    .eq("brand_id", product.brand_id)
    .eq("is_active", true)
    .neq("id", product.id)
    .limit(8);

  const brand = product.brand as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo_url: string | null;
    vendor:
      | {
          id: string;
          name: string;
          slug: string;
          shipping_fee: number | string;
          free_shipping_threshold: number | string | null;
          lead_time_days: number | string | null;
        }
      | Array<{
          id: string;
          name: string;
          slug: string;
          shipping_fee: number | string;
          free_shipping_threshold: number | string | null;
          lead_time_days: number | string | null;
        }>
      | null;
  } | null;

  const vendorRaw = brand?.vendor;
  const vendorRow = Array.isArray(vendorRaw) ? vendorRaw[0] : vendorRaw;
  if (!vendorRow || !brand) {
    notFound();
  }

  const vendorForClient = {
    id: String(vendorRow.id),
    slug: String(vendorRow.slug),
    name: String(vendorRow.name),
    shippingFee: Number(vendorRow.shipping_fee),
    freeShippingThreshold:
      vendorRow.free_shipping_threshold == null ?
        null
      : Number(vendorRow.free_shipping_threshold),
    leadTimeDays: Number(vendorRow.lead_time_days ?? 3),
  };

  const productNameStr = product.name as string;
  const shopPointsBalance = Math.max(
    0,
    Math.floor(Number(profile.shop_points_balance ?? 0)),
  );
  const detailA11yTitle = `${productNameStr}，購物金餘額 ${shopPointsBalance.toLocaleString('zh-TW')} 元`;

  return (
    <div className="space-y-2">
      <StickyPageHeader
        anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
        shellClassName="mb-0"
        spacing="compact"
        leading={<HeaderBackButton />}
        title={detailA11yTitle}
        titleSlot={<ShopHeaderPointsTitle balance={shopPointsBalance} />}
        action={
          <ShopProductDetailHeaderActions productName={productNameStr} />
        }
      />

      <ProductDetailMaraisClient
        key={product.id as string}
        productId={product.id as string}
        productName={product.name as string}
        imageUrl={(product.image_url as string | null) ?? null}
        description={(product.description as string | null) ?? null}
        categoryLabel={categoryLabel}
        dietTags={product.diet_tags as string[] | null}
        certTags={product.cert_tags as string[] | null}
        ingredients={(product.ingredients as string | null) ?? null}
        origin={(product.origin as string | null) ?? null}
        vendor={vendorForClient}
        brand={{
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          description: brand.description,
          logo_url: brand.logo_url,
        }}
        brandProductCount={brandProductCount}
        variants={(product.variants ?? []) as Array<{
          id: string;
          label: string;
          weight_g: number;
          price: number;
          stock: number | null;
          list_price: number | null;
        }>}
        fitReasons={fitReasons}
        nutrition={{
          calories: Number(product.calories),
          carb_g: Number(product.carb_g),
          protein_g: Number(product.protein_g),
          fat_g: Number(product.fat_g),
          fiber_g: product.fiber_g != null ? Number(product.fiber_g) : null,
          sugar_g: product.sugar_g != null ? Number(product.sugar_g) : null,
          sodium_mg: product.sodium_mg != null ? Number(product.sodium_mg) : null,
          serving_size_g: Number(product.serving_size_g),
        }}
        sameBrand={(sameBrand ?? []) as Array<{
          id: string;
          name: string;
          image_url: string | null;
          variants: { price: number }[] | null;
        }>}
        initialIsFavorite={favoriteRow != null}
        analyticsClickSource={analyticsClickSource}
      />
    </div>
  );
}
