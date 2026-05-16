import Link from 'next/link';
import { History } from 'lucide-react';

import { HEADER_ACTION_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';

export default function GuardLoading() {
  return (
    <div className="space-y-3" aria-busy aria-label="載入守衛">
      <StickyPageHeader
        title="食品安全守衛"
        spacing="compact"
        action={
          <Link
            href="/guard/records"
            aria-label="食品安全分析紀錄"
            className={HEADER_ACTION_ICON_CLASS}
          >
            <History
              className="h-[18px] w-[18px]"
              aria-hidden
              strokeWidth={1.75}
            />
          </Link>
        }
      />
      <div className="h-48 w-full animate-pulse rounded-xl bg-muted/70" />
      <div className="h-32 w-full animate-pulse rounded-xl bg-muted/60" />
    </div>
  );
}
