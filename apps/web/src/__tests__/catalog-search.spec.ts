import { describe, expect, it } from 'vitest';
import {
  buildSearchEntries,
  searchCatalogEntries,
  type CatalogProduct,
  type CatalogVariant,
} from '@plumbing/catalog/catalogApi';

const variant = (id: string, productId: string, label = 'Default'): CatalogVariant => ({
  id,
  productId,
  label,
  price: 100,
  priceRetail: 120,
  sku: null,
  attributes: {},
  isActive: true,
});

describe('catalog search ranking', () => {
  it('ranks product-name matches ahead of description-only matches', () => {
    const productsById: Record<string, CatalogProduct> = {
      descriptionOnly: {
        id: 'descriptionOnly',
        categoryId: 'fittings',
        sortOrder: 1,
        name: 'Industrial reducer',
        description: 'Copper pipe adapter for repair work',
        imageUrl: null,
        variants: [variant('descriptionOnlyVariant', 'descriptionOnly')],
      },
      nameMatch: {
        id: 'nameMatch',
        categoryId: 'fittings',
        sortOrder: 2,
        name: 'Copper pipe elbow',
        description: 'Standard fitting',
        imageUrl: null,
        variants: [variant('nameMatchVariant', 'nameMatch')],
      },
    };
    const entries = buildSearchEntries(
      [variant('descriptionOnlyVariant', 'descriptionOnly'), variant('nameMatchVariant', 'nameMatch')],
      productsById
    );

    const results = searchCatalogEntries(entries, 'copper');

    expect(results.map((entry) => entry.productId)).toEqual(['nameMatch', 'descriptionOnly']);
  });
});
