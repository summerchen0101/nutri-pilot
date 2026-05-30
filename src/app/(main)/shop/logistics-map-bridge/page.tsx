import { Suspense } from 'react';

import { LogisticsMapBridgeClientLoader } from '@/app/(main)/shop/logistics-map-bridge/logistics-map-bridge-loader';
import { STICKY_PAGE_HEADER_TOP_SAFE_CLASS } from '@/components/layout/sticky-page-header-top-safe-class';
import { cn } from '@/lib/utils/cn';

export default function LogisticsMapBridgePage() {
  return (
    <div className={cn(STICKY_PAGE_HEADER_TOP_SAFE_CLASS)}>
      <Suspense
        fallback={
          <div className="mx-auto max-w-md px-4 py-12 text-center">
            <p className="text-body text-muted-foreground">載入門市地圖…</p>
          </div>
        }
      >
        <LogisticsMapBridgeClientLoader />
      </Suspense>
    </div>
  );
}
