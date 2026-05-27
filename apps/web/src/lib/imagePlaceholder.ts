/**
 * Lightweight SVG blur placeholders for next/image.
 *
 * next/image can auto-generate blurDataURL only for statically-imported local
 * images. For dynamic/remote URLs we supply a tiny solid-colour SVG instead —
 * it produces the same "colour wash before the real image arrives" effect with
 * zero network cost.
 *
 * Usage:
 *   <Image placeholder="blur" blurDataURL={BLUR_SLATE} … />
 */

/** Slate-100 (#f1f5f9) — use on white/light card backgrounds. */
export const BLUR_SLATE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzYnPjxyZWN0IHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIGZpbGw9JyNmMWY1ZjknLz48L3N2Zz4=';

/** Slate-950 (#0f172a) — use on dark hero / banner backgrounds. */
export const BLUR_DARK =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzYnPjxyZWN0IHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIGZpbGw9JyMxZTI5M2InLz48L3N2Zz4=';
