'use client';

import {
  PageHeader,
  type PageHeaderProps,
} from '@/components/layout/page-header';
import { StickyPageHeaderShell } from '@/components/layout/sticky-page-header-shell';

export type { PageHeaderProps } from '@/components/layout/page-header';

export function StickyPageHeader({
  anchorId,
  ...pageHeaderProps
}: PageHeaderProps) {
  return (
    <StickyPageHeaderShell anchorId={anchorId}>
      <PageHeader {...pageHeaderProps} />
    </StickyPageHeaderShell>
  );
}
