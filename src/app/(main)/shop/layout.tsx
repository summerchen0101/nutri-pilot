import { ShopCartPanel } from '@/app/(main)/shop/_components/shop-cart-panel';

export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <ShopCartPanel />
    </>
  );
}
