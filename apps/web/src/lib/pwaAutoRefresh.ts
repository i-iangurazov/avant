export const DEFAULT_PWA_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

type StandaloneInput = {
  displayMode?: boolean;
  navigatorStandalone?: boolean;
};

export const isStandaloneFrom = ({ displayMode, navigatorStandalone }: StandaloneInput) =>
  Boolean(displayMode || navigatorStandalone);

export const isStandaloneMode = () => {
  if (typeof window === 'undefined') return false;
  const displayMode =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const navigatorStandalone =
    typeof navigator !== 'undefined' &&
    'standalone' in navigator &&
    (navigator as { standalone?: boolean }).standalone === true;
  return isStandaloneFrom({ displayMode, navigatorStandalone });
};

export const isCooldownActive = (lastReloadAt: number, now: number, cooldownMs: number) =>
  now - lastReloadAt < cooldownMs;

export const shouldEnablePwaAutoRefresh = (pathname: string) => {
  const normalized = (pathname || '').toLowerCase();
  if (normalized.startsWith('/admin')) return false;
  if (normalized === '/login') return false;
  return true;
};

export const isAutoRefreshEnabled = () => {
  const flag = process.env.NEXT_PUBLIC_PWA_AUTO_REFRESH;
  if (!flag) {
    return process.env.NODE_ENV === 'production';
  }
  const normalized = flag.toLowerCase();
  return !['0', 'false', 'off', 'no'].includes(normalized);
};
