import { createHash } from 'crypto';
import type { CatalogCategory } from './catalogApi';

export const buildCatalogVersion = (categories: CatalogCategory[]) =>
  createHash('sha256').update(JSON.stringify(categories)).digest('hex');
