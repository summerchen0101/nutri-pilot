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
  /** 傳入 `StickyPageHeaderShell` 的 class（例：商城頂欄常駐底色） */
  shellClassName?: string;
};

export function StickyPageHeader({
  anchorId,
  afterHeader,
  scrollContainerRef,
  shellClassName,
  ...pageHeaderProps
}: StickyPageHeaderProps) {
  return (
    <StickyPageHeaderShell
      anchorId={anchorId}
      scrollContainerRef={scrollContainerRef}
      className={shellClassName}
    >
      <PageHeader {...pageHeaderProps} />
      {afterHeader}
    </StickyPageHeaderShell>
  );
}
