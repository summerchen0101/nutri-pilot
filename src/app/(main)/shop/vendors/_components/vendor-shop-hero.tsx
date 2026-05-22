import Image from 'next/image';

import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';

export interface VendorShopHeroProps {
  name: string;
  description: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  shippingFee: number;
  freeShippingThreshold: number | null;
  leadTimeDays: number;
}

export function VendorShopHero({
  name,
  description,
  bannerUrl,
  logoUrl,
  shippingFee,
  freeShippingThreshold,
  leadTimeDays,
}: VendorShopHeroProps) {
  return (
    <section className="space-y-3">
      <div className="relative overflow-hidden rounded-xl bg-primary-light">
        {bannerUrl ?
          <div className="relative aspect-[3/1] w-full bg-muted">
            <Image
              src={bannerUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 440px"
              unoptimized
            />
          </div>
        : <div className="flex aspect-[3/1] w-full items-center justify-center px-6">
            <p className="text-center text-heading-section text-[#2D6B4A]">
              {name}
            </p>
          </div>
        }
      </div>

      <div className="flex items-start gap-3">
        {logoUrl ?
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-hairline border-border bg-background">
            <Image
              src={logoUrl}
              alt=""
              fill
              className="object-cover"
              sizes="56px"
              unoptimized
            />
          </div>
        : null}
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-heading-screen text-foreground">{name}</h1>
          {description ?
            <p className="text-body leading-relaxed text-muted-foreground">
              {description}
            </p>
          : null}
          <p className="text-caption text-muted-foreground">
            運費 NT$ {formatShopGroupedInteger(shippingFee)}
            {freeShippingThreshold != null ?
              ` · 滿 NT$ ${formatShopGroupedInteger(freeShippingThreshold)} 免運`
            : ''}
            {' · '}
            約 {leadTimeDays} 個工作天內出貨
          </p>
        </div>
      </div>
    </section>
  );
}
