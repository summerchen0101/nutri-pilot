import type { ReactNode } from 'react';
import { Noto_Serif_TC } from 'next/font/google';

const shopSerif = Noto_Serif_TC({
  weight: ['500'],
  subsets: ['latin'],
  variable: '--font-shop-serif',
  display: 'swap',
});

export function ShopLayoutSerifScope({ children }: { children: ReactNode }) {
  return <div className={shopSerif.variable}>{children}</div>;
}
