/**
 * Cached wrappers around the heavy Prisma catalog queries.
 *
 * getCatalogCategories does a deep join (categories → subcategories → products
 * → variants → translations) and is called on every storefront page render.
 * Without caching, every request hits the database, making cold responses slow.
 *
 * unstable_cache stores the result in Next.js's Data Cache keyed by locale.
 * Subsequent requests within the revalidation window get the in-memory result
 * — the database is only hit once per 60 seconds per locale.
 *
 * Cache tag 'catalog' allows on-demand revalidation via
 * `revalidateTag('catalog')` when the admin publishes changes.
 */
import { unstable_cache } from 'next/cache';
import { Locale } from '@plumbing/db';
import { getCatalogCategories } from '@plumbing/catalog/catalogData';

export const getCachedCatalogCategories = unstable_cache(
  (locale: Locale) => getCatalogCategories(locale),
  ['catalog-categories'],
  { revalidate: 60, tags: ['catalog'] }
);
