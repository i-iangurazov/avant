'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toastInfo } from '@/lib/toast';
import {
  DEFAULT_PWA_REFRESH_COOLDOWN_MS,
  isAutoRefreshEnabled,
  isCooldownActive,
  isStandaloneMode,
  shouldEnablePwaAutoRefresh,
} from '@/lib/pwaAutoRefresh';

const RELOAD_KEY = 'pwa_last_refresh_at';
const UPDATE_TOAST_ID = 'pwa-update-ready';

type Props = {
  isBusy?: boolean;
  cooldownMs?: number;
};

const readStoredTimestamp = () => {
  if (typeof window === 'undefined') return 0;
  try {
    const fromLocal = Number(localStorage.getItem(RELOAD_KEY) ?? 0);
    if (Number.isFinite(fromLocal) && fromLocal > 0) return fromLocal;
  } catch {
    // Ignore storage errors.
  }
  try {
    const fromSession = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    return Number.isFinite(fromSession) ? fromSession : 0;
  } catch {
    return 0;
  }
};

const writeStoredTimestamp = (value: number) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RELOAD_KEY, String(value));
  } catch {
    // Ignore storage errors.
  }
  try {
    sessionStorage.setItem(RELOAD_KEY, String(value));
  } catch {
    // Ignore storage errors.
  }
};

const hasActiveFormField = () => {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return false;
  if (active.isContentEditable) return true;
  const tag = active.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (active.getAttribute('role') === 'textbox') return true;
  return Boolean(active.closest('form'));
};

const hasOpenOverlay = () => {
  if (document.body.hasAttribute('data-radix-scroll-lock')) return true;
  return Boolean(
    document.querySelector(
      '[data-state="open"][data-slot="sheet-content"],[data-state="open"][data-slot="dialog-content"],[data-state="open"][role="dialog"]'
    )
  );
};

export default function PwaAutoReload({
  isBusy = false,
  cooldownMs = DEFAULT_PWA_REFRESH_COOLDOWN_MS,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const enabled = useMemo(
    () => isAutoRefreshEnabled() && shouldEnablePwaAutoRefresh(pathname),
    [pathname]
  );
  const pendingReasonRef = useRef<'resume' | 'sw-update' | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptRefreshRef = useRef<(reason: 'resume' | 'sw-update') => void>(() => undefined);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const hasBoundSwRef = useRef(false);
  const wasHiddenRef = useRef(false);

  const isSafeToRefresh = useCallback(() => !isBusy && !hasActiveFormField() && !hasOpenOverlay(), [isBusy]);

  const schedulePendingCheck = useCallback(() => {
    if (pendingTimerRef.current) return;
    pendingTimerRef.current = setInterval(() => {
      const reason = pendingReasonRef.current;
      if (!reason) {
        if (pendingTimerRef.current) {
          clearInterval(pendingTimerRef.current);
          pendingTimerRef.current = null;
        }
        return;
      }
      attemptRefreshRef.current(reason);
    }, 1000);
  }, []);

  const attemptRefresh = useCallback(
    (reason: 'resume' | 'sw-update') => {
      if (!enabled) return;
      if (!isStandaloneMode()) return;
      if (!isSafeToRefresh()) {
        pendingReasonRef.current = reason;
        schedulePendingCheck();
        return;
      }

      const now = Date.now();
      const lastReloadAt = readStoredTimestamp();
      if (isCooldownActive(lastReloadAt, now, cooldownMs)) {
        pendingReasonRef.current = null;
        return;
      }

      pendingReasonRef.current = null;
      writeStoredTimestamp(now);

      if (reason === 'sw-update') {
        window.location.reload();
      } else {
        router.refresh();
      }
    },
    [cooldownMs, enabled, isSafeToRefresh, router, schedulePendingCheck]
  );

  useEffect(() => {
    attemptRefreshRef.current = attemptRefresh;
  }, [attemptRefresh]);

  useEffect(() => {
    if (!enabled) return;
    if (!isStandaloneMode()) return;

    wasHiddenRef.current = document.visibilityState !== 'visible';

    const handleVisibility = () => {
      const isVisible = document.visibilityState === 'visible';
      if (isVisible && wasHiddenRef.current) {
        attemptRefresh('resume');
      }
      wasHiddenRef.current = !isVisible;
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (pendingTimerRef.current) {
        clearInterval(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [attemptRefresh, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (hasBoundSwRef.current) return;
    if (!('serviceWorker' in navigator)) return;
    hasBoundSwRef.current = true;

    let isMounted = true;

    const handleUpdateReady = (registration: ServiceWorkerRegistration) => {
      if (!isMounted) return;
      swRegistrationRef.current = registration;
      toastInfo('Доступна новая версия', {
        id: UPDATE_TOAST_ID,
        action: {
          label: 'Обновить',
          onClick: () => {
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
            attemptRefreshRef.current('sw-update');
          },
        },
      });
    };

    const bindRegistration = (registration: ServiceWorkerRegistration) => {
      swRegistrationRef.current = registration;

      if (registration.waiting && navigator.serviceWorker.controller) {
        handleUpdateReady(registration);
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            handleUpdateReady(registration);
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;
      bindRegistration(registration);
    });

    const handleControllerChange = () => {
      if (pendingReasonRef.current !== 'sw-update') return;
      attemptRefreshRef.current('sw-update');
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [enabled]);

  return null;
}
