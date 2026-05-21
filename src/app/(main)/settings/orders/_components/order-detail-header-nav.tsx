import Link from 'next/link';

export function OrderDetailHeaderNav() {
  return (
    <Link
      href="/settings/orders"
      className="text-body text-primary transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 rounded-sm"
    >
      回訂單列表
    </Link>
  );
}
