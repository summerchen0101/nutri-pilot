'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef, useState } from 'react';

function isInternalNavigationClick(
  event: MouseEvent,
  currentPathname: string,
): boolean {
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  const target = event.target;
  if (!(target instanceof Element)) return false;

  const anchor = target.closest('a');
  if (!anchor) return false;
  if (anchor.target === '_blank') return false;
  if (anchor.hasAttribute('download')) return false;

  const rawHref = anchor.getAttribute('href');
  if (!rawHref) return false;
  if (
    rawHref.startsWith('#') ||
    rawHref.startsWith('mailto:') ||
    rawHref.startsWith('tel:')
  ) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(rawHref, window.location.href);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) return false;
  if (url.pathname === currentPathname) return false;

  return true;
}

export function useNavigationLoading(): { isNavigating: boolean } {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const pathnameRef = useRef(pathname);

  useLayoutEffect(() => {
    pathnameRef.current = pathname;
    setIsNavigating(false);
  }, [pathname]);

  useLayoutEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (isInternalNavigationClick(event, pathnameRef.current)) {
        setIsNavigating(true);
      }
    };

    const handlePopState = () => {
      setIsNavigating(true);
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return { isNavigating };
}
