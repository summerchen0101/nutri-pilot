'use client';

import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { buildRecommendedProducts } from '@/app/(main)/dashboard/dashboard-helpers';
import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useCartStore } from '@/lib/shop/cart-store';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import { cn } from '@/lib/utils/cn';

const ADDON_DISPLAY_LIMIT = 8;

type ProfileRow = {
  shop_points_balance: number | null;
  diet_method: string | null;
  shop_personalize_recommendations: boolean | null;
};

type CatalogRow = {
  id: string;
  name: string;
  image_url: string | null;
  protein_g: number;
  sugar_g: number | null;
  diet_tags: string[] | null;
  cert_tags: string[] | null;
  avg_rating: number | null;
  variants: { price: number }[] | null;
};

function PointsToggle({
  pressed,
  onToggle,
}: {
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      onClick={onToggle}
      className={cn(
        'relative h-7 w-11 shrink-0 rounded-full transition-colors',
        pressed ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-neutral-bg-primary transition-transform duration-200 ease-out',
          pressed ? 'translate-x-[18px]' : 'translate-x-0',
        )}
        aria-hidden
      />
    </button>
  );
}

export interface CartCommerceSectionsProps {
  className?: string;
}

export function CartCommerceSections({ className }: CartCommerceSectionsProps) {
  const router = useRouter();
  const closeCartPanel = useCartStore((s) => s.closeCartPanel);
  const lines = useCartStore((s) => s.lines);
  const [couponSheetOpen, setCouponSheetOpen] = useState(false);
  const [pointsApplyPreview, setPointsApplyPreview] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [recommendProducts, setRecommendProducts] = useState<
    {
      id: string;
      name: string;
      imageUrl: string | null;
      price: number;
    }[]
  >([]);
  const [recommendationsFailed, setRecommendationsFailed] = useState(false);

  const redeemablePoints = Math.max(
    0,
    Math.floor(Number(pointsBalance) || 0),
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setRecommendationsFailed(false);
      const supabase = createClient();
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr || !user) {
        if (!cancelled) {
          setPointsBalance(0);
          setRecommendProducts([]);
          setRecommendationsFailed(Boolean(authErr));
        }
        return;
      }

      const [profileRes, scoresRes, catalogRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select(
            'shop_points_balance, diet_method, shop_personalize_recommendations',
          )
          .eq('user_id', user.id)
          .single(),
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

      if (!cancelled && profileRes.error) {
        console.error(profileRes.error.message);
        setPointsBalance(0);
      }
      const profile =
        profileRes.error ? null : (profileRes.data as ProfileRow | null);
      if (!cancelled && profile) {
        setPointsBalance(Number(profile.shop_points_balance ?? 0));
      }

      const scoresPayload =
        scoresRes.error ?
          ([] as { product_id: string; score: number }[])
        : (scoresRes.data ?? []);
      if (!cancelled && scoresRes.error) {
        console.error(scoresRes.error.message);
      }

      if (!cancelled && catalogRes.error) {
        console.error(catalogRes.error.message);
        setRecommendationsFailed(true);
        setRecommendProducts([]);
        return;
      }

      const catalog = (catalogRes.data ?? []) as CatalogRow[];
      const ranked = buildRecommendedProducts({
        products: catalog,
        scores: scoresPayload,
        dietMethod: profile?.diet_method ?? null,
        usePersonalizedScores: profile?.shop_personalize_recommendations !== false,
      });

      const inCart = new Set(lines.map((l) => l.productId));
      const filtered = ranked
        .filter((row) => !inCart.has(row.id))
        .slice(0, ADDON_DISPLAY_LIMIT);

      if (!cancelled) {
        setRecommendProducts(
          filtered.map(({ id, name, imageUrl, price }) => ({
            id,
            name,
            imageUrl,
            price,
          })),
        );
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [lines]);

  function goCouponsSettings() {
    setCouponSheetOpen(false);
    closeCartPanel();
    router.push('/settings/coupons');
  }

  return (
    <div className={cn('space-y-3', className)}>
      <button
        type="button"
        onClick={() => setCouponSheetOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-xl bg-[var(--color-background-primary)] px-3 py-3.5 text-left transition-colors hover:bg-muted/35"
      >
        <span className="text-body text-foreground">優惠券與優惠碼</span>
        <span className="flex items-center gap-0.5 text-caption font-medium text-primary">
          選擇或輸入
          <ChevronRight className="h-3.5 w-3.5 text-primary" aria-hidden />
        </span>
      </button>

      <div className="rounded-xl bg-[var(--color-background-primary)] px-3 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-body text-foreground">點數折抵</p>
            <p className="mt-1 text-caption text-muted-foreground">
              可折抵 {redeemablePoints} 點
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <PointsToggle
              pressed={pointsApplyPreview}
              onToggle={() => setPointsApplyPreview((p) => !p)}
            />
            <span className="text-caption tabular-nums text-muted-foreground">
              −NT$
              {formatShopGroupedInteger(redeemablePoints)}
            </span>
          </div>
        </div>
        <p className="mt-2 text-micro text-muted-foreground">
          結帳折抵細節將於後續版本開放；開關僅為介面示意，不調整購物車總計。
        </p>
      </div>

      <section className="rounded-xl bg-[var(--color-background-primary)] pb-4 pt-3">
        <h3 className="text-center text-heading-card text-foreground">
          人氣商品・加購推薦
        </h3>
        {recommendationsFailed ?
          <p className="mx-3 mt-3 text-caption text-muted-foreground">
            無法載入加購推薦，請稍後再試。
          </p>
        : null}
        {!recommendationsFailed && recommendProducts.length === 0 ?
          <p className="mx-3 mt-3 text-caption text-muted-foreground">
            目前沒有其他推薦商品。
          </p>
        : null}
        {!recommendationsFailed && recommendProducts.length > 0 ?
          <div className="hide-scrollbar mt-3 flex gap-2.5 overflow-x-auto px-3 pb-1 [-webkit-overflow-scrolling:touch]">
            {recommendProducts.map((product) => (
              <div
                key={product.id}
                className="flex w-[146px] shrink-0 flex-col overflow-hidden rounded-xl bg-[var(--color-background-primary)]"
              >
                <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-muted">
                  {product.imageUrl ?
                    <Image
                      src={product.imageUrl}
                      alt=""
                      fill
                      sizes="146px"
                      className="object-cover"
                      unoptimized
                    />
                  : null}
                </div>
                <div className="flex min-h-0 flex-1 flex-col p-2.5">
                  <p className="line-clamp-2 text-body font-medium leading-snug text-foreground">
                    {product.name}
                  </p>
                  <p className="mt-1.5 tabular-nums text-body font-medium text-primary">
                    NT$ {formatShopGroupedInteger(Math.round(product.price))}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-auto w-full shrink-0"
                    onClick={() => {
                      closeCartPanel();
                      router.push(`/shop/${product.id}`);
                    }}
                  >
                    我要加購
                  </Button>
                </div>
              </div>
            ))}
          </div>
        : null}
      </section>

      <BottomSheetShell
        open={couponSheetOpen}
        title="優惠券與優惠碼"
        onClose={() => setCouponSheetOpen(false)}
      >
        <p className="text-body leading-relaxed text-muted-foreground">
          優惠券與優惠碼將於後續版本開放核銷。可先於「設定」頁查看說明。
        </p>
        <Button type="button" className="mt-4 w-full" onClick={goCouponsSettings}>
          前往優惠券
        </Button>
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full"
          onClick={() => setCouponSheetOpen(false)}
        >
          關閉
        </Button>
      </BottomSheetShell>
    </div>
  );
}
