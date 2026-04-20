'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  SHOP_CATEGORY_KEYS,
  SHOP_CATEGORY_LABEL,
  type ShopCategoryKey,
} from '@/lib/shop/constants';
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
  } | null;
  variants: Array<{
    id: string;
    label: string;
    price: number;
    sub_price: number | null;
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
  brands: BrandRow[];
  dietMethod: string;
}

function CategoryIcon({ category }: { category: ShopCategoryKey }) {
  if (category === 'all') {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <circle cx="10" cy="10" r="6" />
      </svg>
    );
  }
  if (category === 'nuts') {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path d="M10 3c2.6 0 4.5 2 4.5 4.7v2.8c0 3-2 5.5-4.5 5.5s-4.5-2.5-4.5-5.5V7.7C5.5 5 7.4 3 10 3z" />
      </svg>
    );
  }
  if (category === 'protein_bar') {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <rect x="3.5" y="6.5" width="13" height="7" rx="2" />
        <path d="M7 8.5h6M7 11.5h4" />
      </svg>
    );
  }
  if (category === 'supplement') {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <rect x="6" y="4" width="8" height="12" rx="2" />
        <path d="M8 4h4M8 9h4" />
      </svg>
    );
  }
  if (category === 'drink') {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path d="M6 4h8l-1 12H7L6 4z" />
        <path d="M8 4V2h4v2" />
      </svg>
    );
  }
  if (category === 'snack') {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path d="M6 6h8l1 8H5l1-8z" />
        <path d="M8 6V4h4v2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path d="M5 6h10v8H5z" />
      <path d="M8 6V4h4v2M8 10h4" />
    </svg>
  );
}

export function ShopHomeClient({
  initialProducts,
  brands,
  dietMethod,
}: Props) {
  const [category, setCategory] = useState<ShopCategoryKey>('all');
  const [filters, setFilters] = useState<string[]>([]);

  const toggleFilter = (key: string) => {
    setFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const filtered = useMemo(() => {
    let list = [...initialProducts];

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

    list.sort((a, b) => b.score - a.score);

    return list;
  }, [initialProducts, category, filters, dietMethod]);

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[13px] font-medium text-foreground">分類</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {SHOP_CATEGORY_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={cn(
                'flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors',
                category === key ?
                  'bg-[#E8F5EE] text-[#2D6B4A]'
                : 'border-[0.5px] border-border bg-card text-muted-foreground hover:border-[#4C956C]/40',
              )}
            >
              <span className="h-4 w-4">
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
        <p className="text-[13px] font-medium text-foreground">篩選</p>
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
                : 'border-[0.5px] border-border bg-secondary text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="text-[13px] font-medium text-foreground">
          推薦商品（依個人化分數）
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {filtered.map((p) => {
            const minPrice = Math.min(
              ...p.variants.map((v) => Number(v.price)),
            );
            return (
              <Link
                key={p.id}
                href={`/shop/${p.id}`}
                className="overflow-hidden rounded-xl border-[0.5px] border-border bg-card transition-colors hover:border-[#4C956C]/50"
              >
                <div className="relative aspect-square bg-muted">
                  {p.image_url ?
                    <Image
                      src={p.image_url}
                      alt=""
                      fill
                      sizes="160px"
                      className="object-cover"
                      unoptimized
                    />
                  : null}
                  {p.score > 0 ?
                    <span className="absolute left-2 top-2 rounded-full bg-[#E8F5EE] px-2 py-0.5 text-[10px] font-medium text-[#2D6B4A]">
                      推薦 {p.score.toFixed(0)}
                    </span>
                  : null}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {p.brand?.name ?? ''}
                  </p>
                  <p className="mt-2 text-[13px] font-medium text-foreground">
                    NT$ {minPrice.toFixed(0)}
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {' '}
                      起
                    </span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
        {filtered.length === 0 ?
          <p className="mt-4 text-[13px] text-muted-foreground">
            此條件下暫無商品，請調整篩選。
          </p>
        : null}
      </section>

      <section>
        <p className="text-[15px] font-medium text-foreground">精選品牌</p>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {brands
            .filter((b) => b.productCount > 0)
            .map((b) => (
              <div
                key={b.id}
                className="min-w-[140px] shrink-0 rounded-xl border-[0.5px] border-border bg-card p-3"
              >
                <p className="text-[13px] font-medium text-foreground">
                  {b.name}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {b.productCount} 件商品
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
