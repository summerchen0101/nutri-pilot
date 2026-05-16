import { ShopCartPanel } from '@/app/(main)/shop/_components/shop-cart-panel';
import { ShopCatalogPanels } from '@/app/(main)/shop/_components/shop-catalog-panels';
import { ShopCartScrollFab } from '@/app/(main)/shop/_components/shop-cart-scroll-fab';

export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <ShopCatalogPanels />
      <ShopCartScrollFab />
      <ShopCartPanel />
    </>
  );
}
