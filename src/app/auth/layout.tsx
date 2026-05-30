import { STICKY_PAGE_HEADER_TOP_SAFE_CLASS } from '@/components/layout/sticky-page-header-top-safe-class';
import { cn } from '@/lib/utils/cn';

export default function AuthCallbackLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={cn('min-h-screen', STICKY_PAGE_HEADER_TOP_SAFE_CLASS)}>
      {children}
    </div>
  );
}
