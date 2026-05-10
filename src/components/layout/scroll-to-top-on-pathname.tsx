'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect } from 'react';

function scrollViewportToTop(): void {
  window.scrollTo(0, 0);
  const root = document.scrollingElement;
  if (root) {
    root.scrollTop = 0;
    root.scrollLeft = 0;
  }
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function ScrollToTopOnPathname() {
  const pathname = usePathname();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useLayoutEffect(() => {
    scrollViewportToTop();

    let nestedRafId = 0;
    const outerRafId = window.requestAnimationFrame(() => {
      scrollViewportToTop();
      nestedRafId = window.requestAnimationFrame(() => {
        scrollViewportToTop();
      });
    });

    return () => {
      window.cancelAnimationFrame(outerRafId);
      if (nestedRafId !== 0) {
        window.cancelAnimationFrame(nestedRafId);
      }
    };
  }, [pathname]);

  useEffect(() => {
    scrollViewportToTop();
    const timeoutId = window.setTimeout(scrollViewportToTop, 0);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  return null;
}
