'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { analyticsPath } from '@/lib/analytics/routes';
import { trackWeddingEvent, trackWeddingPage } from '@/lib/analytics/client';

const subscribe = () => () => {};
export default function WeddingAnalytics({ pathname, unlocked }: { pathname: string; unlocked: boolean }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const lastPath = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!hydrated) return;
    const path = analyticsPath(pathname, unlocked);
    if (path === lastPath.current) return;
    lastPath.current = path;
    trackWeddingPage(path);
  }, [hydrated, pathname, unlocked]);

  useEffect(() => {
    function click(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest('[data-wedding-event]') : null;
      const name = target?.getAttribute('data-wedding-event');
      if (name === 'registry_clicked' || name === 'directions_clicked') trackWeddingEvent(name);
    }
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, []);
  return null;
}
