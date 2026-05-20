'use client';

import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const MIN_NAVIGATION_LOADING_MS = 250;

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

interface NavigationLoadingContextValue {
  isNavigating: boolean;
  startNavigationLoading: () => void;
}

const NavigationLoadingContext =
  createContext<NavigationLoadingContextValue | null>(null);

export function NavigationLoadingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const pathnameRef = useRef(pathname);
  const startedAtRef = useRef<number | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startNavigationLoading = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    startedAtRef.current = Date.now();
    setIsNavigating(true);
  }, []);

  const scheduleClearAfterMinDuration = useCallback(() => {
    const startedAt = startedAtRef.current;
    if (startedAt == null) return;

    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, MIN_NAVIGATION_LOADING_MS - elapsed);

    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }

    clearTimerRef.current = setTimeout(() => {
      clearTimerRef.current = null;
      startedAtRef.current = null;
      setIsNavigating(false);
    }, remaining);
  }, []);

  useLayoutEffect(() => {
    pathnameRef.current = pathname;
    scheduleClearAfterMinDuration();
  }, [pathname, scheduleClearAfterMinDuration]);

  useLayoutEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (isInternalNavigationClick(event, pathnameRef.current)) {
        startNavigationLoading();
      }
    };

    const handlePopState = () => {
      startNavigationLoading();
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handlePopState);
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    };
  }, [startNavigationLoading]);

  return (
    <NavigationLoadingContext.Provider
      value={{ isNavigating, startNavigationLoading }}
    >
      {children}
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading(): { isNavigating: boolean } {
  const ctx = useContext(NavigationLoadingContext);
  if (!ctx) {
    throw new Error(
      'useNavigationLoading must be used within NavigationLoadingProvider',
    );
  }
  return { isNavigating: ctx.isNavigating };
}

export function useStartNavigationLoading(): () => void {
  const ctx = useContext(NavigationLoadingContext);
  if (!ctx) {
    throw new Error(
      'useStartNavigationLoading must be used within NavigationLoadingProvider',
    );
  }
  return ctx.startNavigationLoading;
}
