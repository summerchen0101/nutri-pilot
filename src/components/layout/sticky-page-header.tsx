'use client';

import type { ReactNode } from 'react';

import {
  PageHeader,
  type PageHeaderProps,
} from '@/components/layout/page-header';
import { StickyPageHeaderShell } from '@/components/layout/sticky-page-header-shell';

export type { PageHeaderProps } from '@/components/layout/page-header';

export type StickyPageHeaderProps = PageHeaderProps & {
  /** 標題列下方、仍隨 sticky 殼吸附的區塊（例如商城列表分類列） */
  afterHeader?: ReactNode;
};

export function StickyPageHeader({
  anchorId,
  afterHeader,
  ...pageHeaderProps
}: StickyPageHeaderProps) {
  return (
    <StickyPageHeaderShell anchorId={anchorId}>
      <PageHeader {...pageHeaderProps} />
      {afterHeader}
    </StickyPageHeaderShell>
  );
}
