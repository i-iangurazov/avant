import { describe, expect, it } from 'vitest';
import {
  buildSearchEntries,
  filterCatalogBySearch,
  searchCatalogEntries,
  type CatalogCategory,
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

  it('filters catalog groups to matching products only', () => {
    const productsById: Record<string, CatalogProduct> = {
      first: {
        id: 'first',
        categoryId: 'sprinklers',
        sortOrder: 1,
        name: 'Разбрызгиватель SD1004',
        description: 'Размер 1/2 ду 15',
        imageUrl: null,
        variants: [variant('firstVariant', 'first')],
      },
      second: {
        id: 'second',
        categoryId: 'sprinklers',
        sortOrder: 2,
        name: 'Кран шаровый',
        description: 'Латунный',
        imageUrl: null,
        variants: [variant('secondVariant', 'second')],
      },
    };
    const categories: CatalogCategory[] = [
      {
        id: 'sprinklers',
        sortOrder: 1,
        name: 'Спринклеры',
        subcategories: [],
        products: [productsById.first, productsById.second],
      },
    ];
    const entries = buildSearchEntries([variant('firstVariant', 'first'), variant('secondVariant', 'second')], productsById);

    const result = filterCatalogBySearch(categories, entries, 'SD1004');

    expect(result.categories).toHaveLength(1);
    expect(result.categories[0]?.products.map((product) => product.id)).toEqual(['first']);
    expect(result.matchedVariantByProductId.get('first')).toBe('firstVariant');
  });
});
