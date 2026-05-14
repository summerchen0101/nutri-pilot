'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  Cookie,
  CupSoda,
  LayoutGrid,
  ListFilter,
  Nut,
  Package,
  PillBottle,
  Sparkles,
  Store,
  UtensilsCrossed,
} from 'lucide-react';

import { ShopQuickAddCartDialog } from '@/app/(main)/shop/_components/shop-quick-add-cart-dialog';
import { ShopCatalogProductCard } from '@/app/(main)/shop/shop-catalog-product-card';
import { toggleProductFavorite } from '@/app/(main)/shop/favorite-actions';
import { SectionHeading } from '@/components/ui/section-heading';
import {
  SHOP_CATEGORY_KEYS,
  SHOP_CATEGORY_LABEL,
  type ShopCategoryKey,
} from '@/lib/shop/constants';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import { cn } from '@/lib/utils/cn';

export interface ShopProductRow {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  category: string;
  calories: number;
  protein_g: number;
  sugar_g: number | null;
  diet_tags: string[] | null;
  cert_tags: string[] | null;
  avg_rating: number | null;
  score: number;
  brand: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    vendor: {
      id: string;
      name: string;
      shipping_fee: number;
      free_shipping_threshold: number | null;
      lead_time_days: number;
    };
  } | null;
  variants: Array<{
    id: string;
    label: string;
    price: number;
    stock: number | null;
  }>;
}

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  productCount: number;
}

interface Props {
  initialProducts: ShopProductRow[];
  initialFavoriteProductIds: string[];
  brands: BrandRow[];
  dietMethod: string;
  usePersonalizedScores?: boolean;
}

function CategoryIcon({ category }: { category: ShopCategoryKey }) {
  if (category === 'all') {
    return <LayoutGrid className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (category === 'nuts') {
    return <Nut className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (category === 'protein_bar') {
    return <Package className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (category === 'supplement') {
    return <PillBottle className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (category === 'drink') {
    return <CupSoda className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (category === 'snack') {
    return <Cookie className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  return <UtensilsCrossed className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
}

export function ShopHomeClient({
  initialProducts,
  initialFavoriteProductIds,
  brands,
  dietMethod,
  usePersonalizedScores = true,
}: Props) {
  const [category, setCategory] = useState<ShopCategoryKey>('all');
  const [filters, setFilters] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState(
    () => new Set(initialFavoriteProductIds),
  );
  const [quickAddProduct, setQuickAddProduct] = useState<ShopProductRow | null>(
    null,
  );
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(
    null,
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    setFavoriteIds(new Set(initialFavoriteProductIds));
  }, [initialFavoriteProductIds]);

  const toggleFilter = (key: string) => {
    setFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const filtered = useMemo(() => {
    let list = initialProducts.filter(
      (p) => p.brand != null && p.brand.vendor != null,
    );

    if (category !== 'all') {
      list = list.filter((p) => p.category === category);
    }

    if (filters.includes('matches_diet')) {
      list = list.filter((p) =>
        (p.diet_tags ?? []).includes(dietMethod),
      );
    }
    if (filters.includes('high_protein')) {
      list = list.filter((p) => Number(p.protein_g) >= 15);
    }
    if (filters.includes('low_sugar')) {
      list = list.filter((p) => Number(p.sugar_g ?? 0) <= 5);
    }
    if (filters.includes('organic')) {
      list = list.filter((p) => (p.cert_tags ?? []).includes('organic'));
    }

    list.sort((a, b) => {
      if (usePersonalizedScores) {
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;
      }
      return Number(b.avg_rating ?? 0) - Number(a.avg_rating ?? 0);
    });

    return list;
  }, [initialProducts, category, filters, dietMethod, usePersonalizedScores]);

  function handleToggleFavorite(productId: string) {
    const was = favoriteIds.has(productId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (was) next.delete(productId);
      else next.add(productId);
      return next;
    });
    setPendingFavoriteId(productId);
    startTransition(() => {
      void (async () => {
        const res = await toggleProductFavorite(productId);
        setPendingFavoriteId((cur) => (cur === productId ? null : cur));
        if (!res.ok) {
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            if (was) next.add(productId);
            else next.delete(productId);
            return next;
          });
          window.alert(res.error ?? '操作失敗');
          return;
        }
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (res.isFavorite) next.add(productId);
          else next.delete(productId);
          return next;
        });
      })();
    });
  }

  return (
    <div className="space-y-5">
      <section>
        <SectionHeading icon={LayoutGrid}>分類</SectionHeading>
        <div className="hide-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1 pr-1 [-webkit-overflow-scrolling:touch]">
          {SHOP_CATEGORY_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={cn(
                'flex h-[60px] min-w-[60px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1 text-[11px] font-medium transition-colors',
                category === key ?
                  'bg-primary text-white'
                : 'border-hairline border-transparent bg-card text-muted-foreground hover:border-primary/40',
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center">
                <CategoryIcon category={key} />
              </span>
              <span className="leading-none">
                {key === 'all' ? '全部' : SHOP_CATEGORY_LABEL[key]}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading icon={ListFilter}>篩選</SectionHeading>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { key: 'matches_diet', label: '符合計畫飲食法' },
            { key: 'high_protein', label: '高蛋白（≥15g）' },
            { key: 'low_sugar', label: '低糖（≤5g）' },
            { key: 'organic', label: '有機認證' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleFilter(key)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors',
                filters.includes(key) ?
                  'bg-[#1E212B] text-white'
                : 'border-hairline border-border bg-secondary text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading icon={Sparkles}>推薦商品（依個人化分數）</SectionHeading>
        <div className="mt-3 grid grid-cols-2 gap-3 items-stretch">
          {filtered.map((p) => (
            <ShopCatalogProductCard
              key={p.id}
              product={p}
              isFavorite={favoriteIds.has(p.id)}
              isFavoritePending={pendingFavoriteId === p.id}
              onToggleFavorite={() => {
                handleToggleFavorite(p.id);
              }}
              onQuickAdd={() => {
                setQuickAddProduct(p);
              }}
            />
          ))}
        </div>
        {filtered.length === 0 ?
          <p className="mt-4 text-[13px] text-muted-foreground">
            此條件下暫無商品，請調整篩選。
          </p>
        : null}
      </section>

      <ShopQuickAddCartDialog
        open={quickAddProduct != null}
        product={quickAddProduct}
        onClose={() => {
          setQuickAddProduct(null);
        }}
      />

      <section>
        <SectionHeading icon={Store}>精選品牌</SectionHeading>
        <div className="hide-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {brands
            .filter((b) => b.productCount > 0)
            .map((b) => (
              <div
                key={b.id}
                className="min-w-[140px] shrink-0 rounded-xl bg-card p-3"
              >
                <p className="text-[13px] font-medium text-foreground">
                  {b.name}
                </p>
                <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                  {formatShopGroupedInteger(b.productCount)} 件商品
                </p>
                <Link
                  href="/shop"
                  className="mt-2 inline-block text-[11px] font-medium text-[#4C956C]"
                >
                  查看商城
                </Link>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
