"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Apple,
  BookOpen,
  ChevronRight,
  CircleCheck,
  Info,
  Leaf,
  MapPin,
  Sparkles,
  Store,
} from "lucide-react";

import { ShopAddToCartSheet } from "@/app/(main)/shop/_components/shop-add-to-cart-sheet";
import { ProductFavoriteDetailBarButton } from "@/app/(main)/shop/_components/product-favorite-controls";
import { MAIN_SHELL_CONTENT_WIDTH_CLASS } from "@/components/layout/main-shell-content-width-class";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { trackProductEvent } from "@/lib/analytics/track";
import { variantListStrikePrice } from "@/lib/shop/catalog-card-price";
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from "@/lib/shop/constants";
import {
  formatShopGroupedDecimal,
  formatShopGroupedInteger,
} from "@/lib/shop/format-shop-number";
import { getDietTagLabel } from "@/lib/shop/diet-tag-label";
import { buildVendorShopHref } from "@/lib/shop/vendor-shop-path";
import {
  getPreferredSelectableVariantId,
  isVariantSelectable,
} from "@/lib/shop/variant-stock";
import { cn } from "@/lib/utils/cn";

type DetailTab = "intro" | "delivery" | "payment";

interface FitReasonItem {
  type: "positive" | "info" | "caution";
  text: string;
}

interface SameBrandProduct {
  id: string;
  name: string;
  image_url: string | null;
  variants: { price: number }[] | null;
}

export interface ProductDetailMaraisClientProps {
  productId: string;
  productName: string;
  imageUrl: string | null;
  description: string | null;
  categoryLabel: string;
  dietTags: string[] | null;
  certTags: string[] | null;
  ingredients: string | null;
  origin: string | null;
  vendor: {
    id: string;
    slug: string;
    name: string;
    shippingFee: number;
    freeShippingThreshold: number | null;
    leadTimeDays: number;
  };
  brand: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo_url: string | null;
  };
  brandProductCount: number;
  variants: Array<{
    id: string;
    label: string;
    weight_g: number;
    price: number;
    stock: number | null;
    list_price: number | null;
  }>;
  fitReasons: FitReasonItem[];
  nutrition: {
    calories: number;
    carb_g: number;
    protein_g: number;
    fat_g: number;
    fiber_g: number | null;
    sugar_g: number | null;
    sodium_mg: number | null;
    serving_size_g: number;
  };
  sameBrand: SameBrandProduct[];
  initialIsFavorite: boolean;
  /** 詳情進入來源（對應 `?source=`）；用於 `click`／`add_to_cart` 埋點 */
  analyticsClickSource: string;
}

function cnReason(type: "positive" | "info" | "caution", base: string): string {
  if (type === "positive") return `${base} text-primary-foreground`;
  if (type === "caution") return `${base} text-amber-600`;
  return base;
}

function FitReasonTypeIcon({
  type,
}: {
  type: "positive" | "info" | "caution";
}) {
  const className = "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground";
  if (type === "positive") {
    return <CircleCheck className={className} aria-hidden />;
  }
  if (type === "caution") {
    return <AlertTriangle className={className} aria-hidden />;
  }
  return <Info className={className} aria-hidden />;
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
      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-caption font-medium text-muted-foreground">
        {categoryLabel}
      </span>
      {(dietTags ?? []).slice(0, 3).map((t) => (
        <span
          key={t}
          className="rounded-full bg-primary px-2.5 py-0.5 text-caption font-medium text-white">
          {getDietTagLabel(t)}
        </span>
      ))}
    </div>
  );
}

const TAB_KEYS: DetailTab[] = ["intro", "delivery", "payment"];

const TAB_LABEL: Record<DetailTab, string> = {
  intro: "介紹",
  delivery: "配送",
  payment: "付款",
};

const DETAIL_TAB_DOCK_EPSILON_PX = 0.75;

export function ProductDetailMaraisClient({
  productId,
  productName,
  imageUrl,
  description,
  categoryLabel,
  dietTags,
  certTags,
  ingredients,
  origin,
  vendor,
  brand,
  brandProductCount,
  variants,
  fitReasons,
  nutrition,
  sameBrand,
  initialIsFavorite,
  analyticsClickSource,
}: ProductDetailMaraisClientProps) {
  const [detailTab, setDetailTab] = useState<DetailTab>("intro");
  const [variantId, setVariantId] = useState(() =>
    getPreferredSelectableVariantId(variants),
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailTabsPinned, setDetailTabsPinned] = useState(false);
  const [detailTabsDockTopPx, setDetailTabsDockTopPx] = useState(0);
  const [detailTabBarHeightPx, setDetailTabBarHeightPx] = useState(0);

  const detailTabsSentinelRef = useRef<HTMLDivElement>(null);
  const detailTabBarRef = useRef<HTMLDivElement>(null);
  const detailTabsDockScrollRafRef = useRef<number>(0);

  const variant = useMemo(() => {
    if (!variants.length) return undefined;
    const picked = variants.find((v) => v.id === variantId);
    if (picked && isVariantSelectable(picked.stock)) return picked;
    return variants.find((v) => isVariantSelectable(v.stock));
  }, [variants, variantId]);

  const unitPayment = variant ? Number(variant.price) : 0;

  const listStrike = useMemo(() => {
    if (!variant) return null;
    const lp = variant.list_price;
    return variantListStrikePrice(
      Number(variant.price),
      lp == null ? null : Number(lp),
    );
  }, [variant]);

  const detailPriceAriaLabel =
    listStrike != null ?
      `優惠價 ${formatShopGroupedInteger(unitPayment)} 元，原價 ${formatShopGroupedInteger(listStrike)} 元`
    : `售價 ${formatShopGroupedInteger(unitPayment)} 元`;

  const sheetVariantPayload = useMemo(
    () =>
      variants.map((v) => ({
        id: v.id,
        label: v.label,
        price: Number(v.price),
        stock: v.stock,
        list_price: v.list_price == null ? null : Number(v.list_price),
      })),
    [variants],
  );

  const introBody =
    (description ?? "").trim().length > 0
      ? (description ?? "").trim()
      : "尚無商品簡介";

  useLayoutEffect(() => {
    const el = detailTabBarRef.current;
    if (!el) return;

    const syncHeight = () => {
      setDetailTabBarHeightPx(el.offsetHeight);
    };

    syncHeight();

    const ro = new ResizeObserver(() => {
      syncHeight();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    trackProductEvent(productId, "click", analyticsClickSource);
  }, [productId, analyticsClickSource]);

  useEffect(() => {
    const syncDock = () => {
      const anchor = document.getElementById(SHOP_HEADER_SCROLL_ANCHOR_ID);
      const sentinel = detailTabsSentinelRef.current;
      if (!anchor || !sentinel) return;

      const headerBottomPx = anchor.getBoundingClientRect().bottom;
      const sentinelTopPx = sentinel.getBoundingClientRect().top;

      setDetailTabsDockTopPx(headerBottomPx);
      setDetailTabsPinned(
        sentinelTopPx <= headerBottomPx + DETAIL_TAB_DOCK_EPSILON_PX,
      );
    };

    const scheduleDockSync = () => {
      if (detailTabsDockScrollRafRef.current !== 0) return;
      detailTabsDockScrollRafRef.current = window.requestAnimationFrame(() => {
        detailTabsDockScrollRafRef.current = 0;
        syncDock();
      });
    };

    syncDock();

    window.addEventListener("scroll", scheduleDockSync, { passive: true });
    window.addEventListener("resize", scheduleDockSync);

    return () => {
      window.removeEventListener("scroll", scheduleDockSync);
      window.removeEventListener("resize", scheduleDockSync);
      if (detailTabsDockScrollRafRef.current !== 0) {
        window.cancelAnimationFrame(detailTabsDockScrollRafRef.current);
        detailTabsDockScrollRafRef.current = 0;
      }
    };
  }, []);

  return (
    <>
      <section className="overflow-hidden rounded-xl bg-card">
        <div className="relative aspect-square w-full bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="400px"
              priority
              unoptimized
            />
          ) : null}
        </div>
        <div className="space-y-3 p-4">
          <h1 className="text-heading-screen text-foreground">{productName}</h1>
          <BadgeRow categoryLabel={categoryLabel} dietTags={dietTags} />
          <p
            aria-label={detailPriceAriaLabel}
            className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-left font-medium leading-tight tabular-nums">
            {listStrike != null ? (
              <span className="text-caption font-medium line-through text-muted-foreground">
                NT$ {formatShopGroupedInteger(listStrike)}
              </span>
            ) : null}
            <span className="text-heading-page text-primary">
              NT$ {formatShopGroupedInteger(unitPayment)}
            </span>
          </p>

          <div className="flex items-center gap-3 rounded-xl bg-secondary/80 px-3 py-2.5">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border-hairline border-border bg-[var(--color-background-primary)]">
              {brand.logo_url ? (
                <Image
                  src={brand.logo_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="44px"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-heading-section text-muted-foreground">
                  {brand.name.slice(0, 1)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium text-foreground">
                {brand.name}
              </p>
              <p className="text-caption tabular-nums text-muted-foreground">
                {formatShopGroupedInteger(brandProductCount)} 個商品
              </p>
            </div>
            <Link
              href={buildVendorShopHref(vendor.slug)}
              className="flex shrink-0 items-center gap-0.5 text-caption font-medium text-[var(--steel-text)]">
              逛逛商城
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/*
       * 商品詳情頁版面鏈上 sticky 不可靠時（祖先 overflow／巢狀 sticky 等），
       * 改以 scroll + `#shop-header-scroll-anchor` 量測頁首底線，將分頁列改為 fixed 停靠。
       */}
      <div>
        <div
          ref={detailTabsSentinelRef}
          className="pointer-events-none h-px w-full shrink-0 opacity-0"
          aria-hidden
        />

        <div className="-mx-4 mb-3">
          {detailTabsPinned ? (
            <div
              aria-hidden
              className="min-h-11 shrink-0"
              style={{
                height:
                  detailTabBarHeightPx > 0 ? detailTabBarHeightPx : undefined,
              }}
            />
          ) : null}

          <div
            ref={detailTabBarRef}
            className={cn(
              'pb-0 pt-2.5',
              detailTabsPinned ?
                'bg-background backdrop-blur-md'
              : 'bg-transparent',
              detailTabsPinned ?
                'fixed inset-x-0 z-[44]'
              : 'relative px-4',
            )}
            style={detailTabsPinned ? { top: detailTabsDockTopPx } : undefined}
          >
            <div
              className={cn(
                "w-full",
                detailTabsPinned ? MAIN_SHELL_CONTENT_WIDTH_CLASS : undefined,
              )}>
              <div
                className="flex w-full border-b-hairline border-border/70"
                role="tablist"
                aria-label="商品資訊分頁">
                {TAB_KEYS.map((key) => {
                  const active = detailTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={cn(
                        "min-w-0 flex-1 basis-0 pb-2.5 pt-0.5 text-center text-heading-section !font-normal text-foreground transition-[color,box-shadow]",
                        active &&
                          "!font-semibold text-primary shadow-[inset_0_-2px_0_0_var(--primary)]",
                      )}
                      onClick={() => {
                        setDetailTab(key);
                      }}>
                      {TAB_LABEL[key]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pb-28">
          {detailTab === "intro" ? (
            <>
              <section className="rounded-xl bg-card p-4">
                <p className="text-body leading-relaxed text-foreground">
                  {introBody}
                </p>
              </section>

              <section className="rounded-xl bg-primary-light p-4">
                <SectionHeading icon={Sparkles}>為什麼適合你</SectionHeading>
                <ul className="mt-3 space-y-2">
                  {fitReasons.map((r, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-body leading-relaxed text-foreground">
                      <FitReasonTypeIcon type={r.type} />
                      <span className={cnReason(r.type, "min-w-0 flex-1")}>
                        {r.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl bg-card p-4">
                <SectionHeading icon={Apple}>營養標示（每份）</SectionHeading>
                <table className="mt-2 w-full text-body">
                  <tbody>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium">熱量</th>
                      <td className="px-3 py-2 tabular-nums">
                        {formatShopGroupedInteger(nutrition.calories)} kcal
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium">
                        碳水化合物
                      </th>
                      <td className="px-3 py-2 tabular-nums">
                        {formatShopGroupedDecimal(nutrition.carb_g, 2)} g
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium">
                        蛋白質
                      </th>
                      <td className="px-3 py-2 tabular-nums">
                        {formatShopGroupedDecimal(nutrition.protein_g, 2)} g
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium">脂肪</th>
                      <td className="px-3 py-2 tabular-nums">
                        {formatShopGroupedDecimal(nutrition.fat_g, 2)} g
                      </td>
                    </tr>
                    {nutrition.fiber_g != null ? (
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left font-medium">
                          膳食纖維
                        </th>
                        <td className="px-3 py-2 tabular-nums">
                          {formatShopGroupedDecimal(nutrition.fiber_g, 2)} g
                        </td>
                      </tr>
                    ) : null}
                    {nutrition.sugar_g != null ? (
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left font-medium">糖</th>
                        <td className="px-3 py-2 tabular-nums">
                          {formatShopGroupedDecimal(nutrition.sugar_g, 2)} g
                        </td>
                      </tr>
                    ) : null}
                    {nutrition.sodium_mg != null ? (
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">鈉</th>
                        <td className="px-3 py-2 tabular-nums">
                          {formatShopGroupedInteger(nutrition.sodium_mg)} mg
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                <p className="mt-1 text-caption text-muted-foreground">
                  份量基準：
                  {formatShopGroupedDecimal(nutrition.serving_size_g, 2)} g
                </p>
              </section>

              <section className="rounded-xl bg-card p-4">
                <SectionHeading icon={Leaf}>成分與產地</SectionHeading>
                <p className="mt-2 text-body leading-relaxed text-foreground">
                  {ingredients ?? "—"}
                </p>
                <p className="mt-3 flex items-start gap-2 text-body text-foreground">
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span>產地：{origin ?? "—"}</span>
                </p>
                {(certTags ?? []).length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(certTags ?? []).map((t: string) => (
                      <span
                        key={t}
                        className="rounded-full bg-secondary px-2.5 py-0.5 text-caption font-medium text-muted-foreground">
                        {t === "organic" ? "有機" : t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>

              {brand.description ? (
                <section className="rounded-xl bg-card p-4">
                  <SectionHeading icon={BookOpen}>品牌故事</SectionHeading>
                  <p className="mt-2 text-body leading-relaxed text-muted-foreground">
                    {brand.description}
                  </p>
                  <Link
                    href={buildVendorShopHref(vendor.slug)}
                    className="mt-3 inline-block text-body font-medium text-primary">
                    查看商城全系列 →
                  </Link>
                </section>
              ) : null}

              {sameBrand.length > 0 ? (
                <section>
                  <SectionHeading icon={Store}>同品牌推薦</SectionHeading>
                  <div className="hide-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                    {sameBrand.map((sp) => {
                      const variantsPrices = sp.variants as
                        | { price: number }[]
                        | null;
                      const minP = variantsPrices?.length
                        ? Math.min(
                            ...variantsPrices.map((v) => Number(v.price)),
                          )
                        : 0;
                      return (
                        <Link
                          key={sp.id}
                          href={`/shop/${sp.id}`}
                          className="flex w-36 shrink-0 flex-col overflow-hidden rounded-xl bg-card">
                          <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-muted">
                            {sp.image_url ? (
                              <Image
                                src={sp.image_url}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="144px"
                                unoptimized
                              />
                            ) : null}
                          </div>
                          <div className="flex flex-1 flex-col p-2">
                            <p className="line-clamp-2 text-caption font-medium leading-snug text-foreground">
                              {sp.name}
                            </p>
                            <p className="mt-1 text-caption tabular-nums text-muted-foreground">
                              NT$ {formatShopGroupedInteger(minP)} 起
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {detailTab === "delivery" ? (
            <section className="rounded-xl bg-card p-4 space-y-3">
              <p className="text-body leading-relaxed text-foreground">
                本商品由廠商倉庫出货。備貨完成後以宅配寄送，實際到貨時間依物流而定。
              </p>
              <ul className="space-y-2 text-body text-muted-foreground">
                <li>
                  運費：NT$ {formatShopGroupedInteger(vendor.shippingFee)}
                  （結帳時依購物車合併計算）
                </li>
                <li>
                  {vendor.freeShippingThreshold != null ? (
                    <>
                      滿 NT${" "}
                      {formatShopGroupedInteger(vendor.freeShippingThreshold)}{" "}
                      免運 （依單一廠商門檻）
                    </>
                  ) : (
                    "免運門檻請見結帳頁說明"
                  )}
                </li>
                <li>預估備貨：約 {vendor.leadTimeDays} 個工作天內出貨</li>
              </ul>
            </section>
          ) : null}

          {detailTab === "payment" ? (
            <section className="rounded-xl bg-card p-4 space-y-2">
              <p className="text-body leading-relaxed text-foreground">
                結帳時支援綠界金流
                信用卡一次付清；實際可用付款方式依結帳頁為準。
              </p>
              <p className="text-caption text-muted-foreground">
                訂單成立後將引導至安全付款頁面完成交易，本平台不於此頁收集完整卡號。
              </p>
            </section>
          ) : null}
        </div>
      </div>

      <ShopAddToCartSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
        }}
        product={{
          id: productId,
          name: productName,
          imageUrl,
        }}
        variants={sheetVariantPayload}
        vendor={vendor}
        selectedVariantId={variantId}
        onVariantIdChange={setVariantId}
        eventSource={analyticsClickSource}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[42]">
        <div className="pointer-events-auto flex w-full items-end gap-3 border-t-hairline border-border bg-[var(--color-background-primary)]/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
          <ProductFavoriteDetailBarButton
            productId={productId}
            initialIsFavorite={initialIsFavorite}
          />
          <Button
            type="button"
            className="min-h-11 min-w-0 flex-1"
            onClick={() => {
              setSheetOpen(true);
            }}>
            選擇商品規格
          </Button>
        </div>
      </div>
    </>
  );
}
