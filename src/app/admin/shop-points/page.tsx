import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ShopPointsAdjustForm } from '@/app/admin/shop-points/_components/shop-points-adjust-form';
import { getAdminRole, staffCan } from '@/lib/admin';

export default async function AdminShopPointsPage() {
  const role = await getAdminRole();
  if (!staffCan(role, 'shop.points.adjust')) {
    redirect('/admin/dashboard');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/dashboard" className="text-caption text-[#4C956C] hover:underline">
        ← 總覽
      </Link>
      <div>
        <h1 className="text-heading-screen text-foreground">購物點手動異動</h1>
        <p className="mt-1 text-caption text-slate-600">
          僅超級管理員。正數發放會建立 ledger 與批次（FIFO）；負數會依有效批次扣抵。請同步留存客服紀錄。
        </p>
      </div>
      <ShopPointsAdjustForm />
    </div>
  );
}
