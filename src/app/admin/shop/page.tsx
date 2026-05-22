import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buttonVisualClassName } from '@/components/ui/button-visual';
import { adminHomeForRole } from '@/lib/admin/admin-home';
import { getAdminRole, staffCan } from '@/lib/admin';

export default async function AdminShopHubPage() {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.manage')) {
    redirect(adminHomeForRole(role ?? 'cs'));
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-heading-screen text-foreground">商城設定</h1>
      <p className="text-body text-muted-foreground">
        管理首頁與分類 Banner、商品分類，以及廠商頁的運送方式與免運門檻。
      </p>
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/shop/banners"
          className={buttonVisualClassName({ variant: 'default' })}
        >
          Banner 管理
        </Link>
        <Link
          href="/admin/shop/categories"
          className={buttonVisualClassName({ variant: 'outline' })}
        >
          分類管理
        </Link>
      </div>
    </div>
  );
}
