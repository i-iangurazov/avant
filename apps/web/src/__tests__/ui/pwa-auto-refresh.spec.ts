import { describe, expect, it } from 'vitest';
import { isCooldownActive, isStandaloneFrom, shouldEnablePwaAutoRefresh } from '@/lib/pwaAutoRefresh';

describe('pwa auto refresh guard', () => {
  it('throttles refresh attempts with cooldown', () => {
    const now = 10_000;
    expect(isCooldownActive(9_500, now, 2_000)).toBe(true);
    expect(isCooldownActive(7_000, now, 2_000)).toBe(false);
  });

  it('detects standalone mode from display or navigator flags', () => {
    expect(isStandaloneFrom({ displayMode: true, navigatorStandalone: false })).toBe(true);
    expect(isStandaloneFrom({ displayMode: false, navigatorStandalone: true })).toBe(true);
    expect(isStandaloneFrom({ displayMode: false, navigatorStandalone: false })).toBe(false);
  });

  it('disables auto refresh for admin/login routes', () => {
    expect(shouldEnablePwaAutoRefresh('/admin/products')).toBe(false);
    expect(shouldEnablePwaAutoRefresh('/login')).toBe(false);
    expect(shouldEnablePwaAutoRefresh('/')).toBe(true);
  });
});
