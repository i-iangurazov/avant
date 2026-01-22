'use client';

import { useEffect } from 'react';

const RELOAD_KEY = 'pwa_last_reload_at';
const MIN_INTERVAL_MS = 3000;

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  const isStandaloneDisplay =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone = 'standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true;
  return isStandaloneDisplay || isIosStandalone;
};

const getNavigationType = () => {
  if (typeof performance === 'undefined') return 'navigate';
  const entries = performance.getEntriesByType?.('navigation');
  if (entries && entries.length > 0) {
    return (entries[0] as PerformanceNavigationTiming).type;
  }
  const legacyType = (performance as { navigation?: { type?: number } }).navigation?.type;
  return legacyType === 1 ? 'reload' : 'navigate';
};

export default function PwaAutoReload() {
  useEffect(() => {
    if (!isStandalone()) return;

    const setLastReload = () => {
      try {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      } catch {
        // Ignore storage errors (private mode, disabled storage, etc).
      }
    };

    const maybeReload = () => {
      let lastReloadAt = 0;
      try {
        lastReloadAt = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
      } catch {
        lastReloadAt = 0;
      }
      const now = Date.now();
      if (now - lastReloadAt < MIN_INTERVAL_MS) return;
      setLastReload();
      window.location.reload();
    };

    if (getNavigationType() === 'reload') {
      setLastReload();
    } else {
      maybeReload();
    }

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      maybeReload();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return null;
}
