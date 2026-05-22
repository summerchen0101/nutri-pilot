'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils/cn';

const CAROUSEL_INTERVAL_MS = 5000;

export type ShopHomeBannerSlide = {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  href: string | null;
};

function BannerSlideContent({ slide }: { slide: ShopHomeBannerSlide }) {
  const cardInner = (
    <div className="relative overflow-hidden rounded-xl bg-primary-light">
      {slide.image_url ?
        <div className="relative aspect-[3/1] w-full bg-muted">
          <Image
            src={slide.image_url}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 440px"
            unoptimized
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 px-6 text-center">
            <p className="text-heading-section text-white">{slide.title}</p>
            {slide.subtitle ?
              <p className="mt-2 text-caption text-white/90">{slide.subtitle}</p>
            : null}
          </div>
        </div>
      : <div className="px-6 py-8 text-center">
          <p className="text-heading-section text-[#2D6B4A]">{slide.title}</p>
          {slide.subtitle ?
            <p className="mt-2 text-caption text-[#2D6B4A]/85">{slide.subtitle}</p>
          : null}
        </div>
      }
    </div>
  );

  if (slide.href) {
    return (
      <Link href={slide.href} className="block transition-opacity hover:opacity-95">
        {cardInner}
      </Link>
    );
  }

  return cardInner;
}

export function ShopHomeBannerCarousel({
  slides,
}: Readonly<{ slides: ShopHomeBannerSlide[] }>) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count]);

  if (count === 0) {
    return null;
  }

  const slide = slides[index];

  return (
    <section aria-label="商城活動" className="space-y-2">
      <BannerSlideContent slide={slide} />
      {count > 1 ?
        <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label="Banner 輪播">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`第 ${i + 1} 則`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-4 bg-primary' : 'w-1.5 bg-border',
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      : null}
    </section>
  );
}
