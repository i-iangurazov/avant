'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { shouldEnablePwaAutoRefresh } from '@/lib/pwaAutoRefresh';

const isProduction = process.env.NODE_ENV === 'production';

const unregisterExistingServiceWorkers = async () => {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => registration.scope.startsWith(window.location.origin))
      .map((registration) => registration.unregister())
  );

  if (!('caches' in window)) return;
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith('workbox-'))
      .map((cacheName) => caches.delete(cacheName))
  );
};

export default function PwaRouteServiceWorker() {
  const pathname = usePathname();
  const shouldRegister = shouldEnablePwaAutoRefresh(pathname);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (!shouldRegister) {
      void unregisterExistingServiceWorkers();
      return;
    }

    if (!isProduction) return;

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Registration failures should not block catalogue rendering.
    });
  }, [shouldRegister]);

  return null;
}
