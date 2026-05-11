import { ShopCartPanel } from '@/app/(main)/shop/_components/shop-cart-panel';
import { ShopCartScrollFab } from '@/app/(main)/shop/_components/shop-cart-scroll-fab';

export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <ShopCartScrollFab />
      <ShopCartPanel />
    </>
  );
}
