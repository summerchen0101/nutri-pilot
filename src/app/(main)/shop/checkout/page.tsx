import { redirect } from 'next/navigation';

/** 書籤／舊連結：結帳改為側欄，不再提供全頁。 */
export default function ShopCheckoutPage() {
  redirect('/shop');
}
