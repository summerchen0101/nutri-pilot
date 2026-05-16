import { ShopCartPanel } from '@/app/(main)/shop/_components/shop-cart-panel';
import { ShopCatalogPanels } from '@/app/(main)/shop/_components/shop-catalog-panels';
import { ShopLayoutSerifScope } from '@/app/(main)/shop/shop-layout-serif';

export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ShopLayoutSerifScope>
      {children}
      <ShopCatalogPanels />
      <ShopCartPanel />
    </ShopLayoutSerifScope>
  );
}
