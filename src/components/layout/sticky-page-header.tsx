'use client';

import type { ReactNode, RefObject } from 'react';

import {
  PageHeader,
  type PageHeaderProps,
} from '@/components/layout/page-header';
import { StickyPageHeaderShell } from '@/components/layout/sticky-page-header-shell';

export type { PageHeaderProps } from '@/components/layout/page-header';

export type StickyPageHeaderProps = PageHeaderProps & {
  /** 標題列下方、仍隨 sticky 殼吸附的區塊（例如商城列表分類列） */
  afterHeader?: ReactNode;
  scrollContainerRef?: RefObject<HTMLElement | null>;
};

export function StickyPageHeader({
  anchorId,
  afterHeader,
  scrollContainerRef,
  ...pageHeaderProps
}: StickyPageHeaderProps) {
  return (
    <StickyPageHeaderShell
      anchorId={anchorId}
      scrollContainerRef={scrollContainerRef}
    >
      <PageHeader {...pageHeaderProps} />
      {afterHeader}
    </StickyPageHeaderShell>
  );
}
