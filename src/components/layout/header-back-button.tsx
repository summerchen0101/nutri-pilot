'use client';

import { useRouter } from 'next/navigation';
import { FiChevronLeft } from 'react-icons/fi';

import { HEADER_ACTION_ICON_CLASS } from '@/components/layout/header-action-icon-styles';

export function HeaderBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="返回"
      className={HEADER_ACTION_ICON_CLASS}
      onClick={() => router.back()}
    >
      <FiChevronLeft className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}
