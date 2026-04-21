import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';

import { ProductDetailClient } from '@/app/(main)/shop/[productId]/product-detail-client';
import { HeaderBackButton } from '@/components/layout/header-back-button';
import { PageHeader } from '@/components/layout/page-header';
import { SHOP_CATEGORY_LABEL } from '@/lib/shop/constants';
import { generateFitReasons } from '@/lib/shop/fit-reasons';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: { productId: string };
}

export default async function ShopProductPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: profile }, { data: goal }] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
    supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  if (!profile || !goal || !profile.diet_method) redirect('/onboarding');

  const { data: product, error } = await supabase
    .from('products')
    .select(
      `
      *,
      brand:brands ( id, name, slug, description, logo_url ),
      variants:product_variants ( id, label, weight_g, price, sub_price, stock, stripe_price_id, stripe_sub_price_id )
    `,
    )
    .eq('id', params.productId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !product) notFound();

  const categoryLabel =
    SHOP_CATEGORY_LABEL[
      product.category as keyof typeof SHOP_CATEGORY_LABEL
    ] ?? product.category;

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
      type: goal.type as 'lose_weight' | 'gain_muscle' | 'maintain',
    },
    { diet_method: profile.diet_method },
  );

  const { data: sameBrand } = await supabase
    .from('products')
    .select(
      'id, name, image_url, slug, variants:product_variants(price)',
    )
    .eq('brand_id', product.brand_id)
    .eq('is_active', true)
    .neq('id', product.id)
    .limit(8);

  const brand = product.brand as
    | {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        logo_url: string | null;
      }
    | null;

  return (
    <div className="space-y-5">
      <PageHeader
        leading={<HeaderBackButton />}
        title={product.name as string}
        description={brand?.name ?? ''}
        action={
          <Link href="/shop" className="text-[13px] font-medium text-primary">
            返回商城
          </Link>
        }
      />

      <div className="overflow-hidden rounded-xl border-[0.5px] border-border bg-card">
        <div className="relative aspect-[4/3] w-full bg-muted">
          {product.image_url ?
            <Image
              src={product.image_url}
              alt=""
              fill
              className="object-cover"
              sizes="400px"
              priority
              unoptimized
            />
          : null}
        </div>
        <div className="space-y-2 p-4">
          <BadgeRow categoryLabel={categoryLabel} dietTags={product.diet_tags} />
          <h2 className="text-[15px] font-medium leading-snug text-foreground">
            商品資訊
          </h2>
        </div>
      </div>

      <ProductDetailClient
        product={{
          id: product.id as string,
          name: product.name as string,
          variants:
            (product.variants ?? []) as Array<{
              id: string;
              label: string;
              weight_g: number;
              price: number;
              sub_price: number | null;
              stock: number | null;
              stripe_price_id: string | null;
              stripe_sub_price_id: string | null;
            }>,
        }}
      />

      <section className="rounded-xl border-[0.5px] border-blue-300 bg-blue-50 p-4">
        <p className="text-[15px] font-medium text-foreground">
          為什麼適合你
        </p>
        <ul className="mt-3 space-y-2">
          {fitReasons.map((r, i) => (
            <li
              key={i}
              className={cnReason(
                r.type,
                'text-[13px] leading-relaxed text-foreground',
              )}
            >
              {r.text}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <p className="text-[15px] font-medium text-foreground">營養標示（每份）</p>
        <div className="mt-2 overflow-hidden rounded-xl border-[0.5px] border-border">
          <table className="w-full text-[13px]">
            <tbody>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-3 py-2 text-left font-medium">熱量</th>
                <td className="px-3 py-2">{Number(product.calories)} kcal</td>
              </tr>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium">碳水化合物</th>
                <td className="px-3 py-2">{Number(product.carb_g)} g</td>
              </tr>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-3 py-2 text-left font-medium">蛋白質</th>
                <td className="px-3 py-2">{Number(product.protein_g)} g</td>
              </tr>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium">脂肪</th>
                <td className="px-3 py-2">{Number(product.fat_g)} g</td>
              </tr>
              {product.fiber_g != null ?
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-3 py-2 text-left font-medium">膳食纖維</th>
                  <td className="px-3 py-2">{Number(product.fiber_g)} g</td>
                </tr>
              : null}
              {product.sugar_g != null ?
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium">糖</th>
                  <td className="px-3 py-2">{Number(product.sugar_g)} g</td>
                </tr>
              : null}
              {product.sodium_mg != null ?
                <tr className="bg-secondary/40">
                  <th className="px-3 py-2 text-left font-medium">鈉</th>
                  <td className="px-3 py-2">{Number(product.sodium_mg)} mg</td>
                </tr>
              : null}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          份量基準：{Number(product.serving_size_g)} g
        </p>
      </section>

      <section className="rounded-xl border-[0.5px] border-border bg-card p-4">
        <p className="text-[15px] font-medium text-foreground">成分與產地</p>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground">
          {product.ingredients ?? '—'}
        </p>
        <p className="mt-3 text-[13px] text-foreground">
          產地：{product.origin ?? '—'}
        </p>
        {(product.cert_tags ?? []).length > 0 ?
          <div className="mt-3 flex flex-wrap gap-2">
            {(product.cert_tags ?? []).map((t: string) => (
              <span
                key={t}
                className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {t === 'organic' ? '有機' : t}
              </span>
            ))}
          </div>
        : null}
      </section>

      {brand?.description ?
        <section className="rounded-xl border-[0.5px] border-border bg-card p-4">
          <p className="text-[15px] font-medium text-foreground">品牌故事</p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {brand.description}
          </p>
          <Link
            href={`/shop`}
            className="mt-3 inline-block text-[13px] font-medium text-primary"
          >
            查看商城全系列 →
          </Link>
        </section>
      : null}

      {(sameBrand ?? []).length > 0 ?
        <section>
          <p className="text-[15px] font-medium text-foreground">同品牌推薦</p>
          <div className="hide-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
            {(sameBrand ?? []).map((sp) => {
              const variants = sp.variants as { price: number }[] | null;
              const minP = variants?.length ?
                Math.min(...variants.map((v) => Number(v.price)))
              : 0;
              return (
                <Link
                  key={sp.id}
                  href={`/shop/${sp.id}`}
                  className="flex w-36 shrink-0 flex-col overflow-hidden rounded-xl border-[0.5px] border-border bg-card"
                >
                  <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-muted">
                    {sp.image_url ?
                      <Image
                        src={sp.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="144px"
                        unoptimized
                      />
                    : null}
                  </div>
                  <div className="flex flex-1 flex-col p-2">
                    <p className="line-clamp-2 text-[11px] font-medium leading-snug text-foreground">
                      {sp.name as string}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      NT$ {minP.toFixed(0)} 起
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      : null}
    </div>
  );
}

function BadgeRow({
  categoryLabel,
  dietTags,
}: {
  categoryLabel: string;
  dietTags: string[] | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        {categoryLabel}
      </span>
      {(dietTags ?? []).slice(0, 3).map((t) => (
        <span
          key={t}
          className="rounded-full bg-primary-light px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function cnReason(
  type: 'positive' | 'info' | 'caution',
  base: string,
): string {
  if (type === 'positive') return `${base} text-primary-foreground`;
  if (type === 'caution') return `${base} text-amber-600`;
  return base;
}
