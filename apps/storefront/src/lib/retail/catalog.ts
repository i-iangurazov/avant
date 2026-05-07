import type { CatalogCategory, CatalogProduct, CatalogSubcategory, CatalogVariant } from '@plumbing/catalog/catalogApi';
import { buildSearchText } from '@plumbing/catalog/search';
import { resolveVariantPrice } from '@plumbing/catalog/pricing';

export type RetailSortOption = 'popular' | 'price-asc' | 'price-desc' | 'name';

export type RetailCatalogItem = {
  id: string;
  product: CatalogProduct;
  category: Pick<CatalogCategory, 'id' | 'name' | 'slug' | 'sortOrder'>;
  subcategory: CatalogSubcategory | null;
  variants: CatalogVariant[];
  minPrice: number;
  maxPrice: number;
  defaultVariantId: string | null;
  searchText: string;
};

export type RetailCategoryPreview = {
  id: string;
  name: string;
  slug?: string | null;
  productCount: number;
  subcategoryCount: number;
  minPrice: number | null;
  sampleProducts: Array<{ id: string; name: string }>;
};

const sortVariantsByRetailPrice = (variants: CatalogVariant[]) =>
  [...variants].sort((left, right) => {
    const leftPrice = resolveVariantPrice(left, 'retail');
    const rightPrice = resolveVariantPrice(right, 'retail');
    if (leftPrice !== rightPrice) return leftPrice - rightPrice;
    return left.label.localeCompare(right.label, 'ru');
  });

export const flattenRetailCatalog = (categories: CatalogCategory[]): RetailCatalogItem[] => {
  const items: RetailCatalogItem[] = [];

  categories.forEach((category) => {
    category.products.forEach((product) => {
      const variants = sortVariantsByRetailPrice(product.variants.filter((variant) => variant.isActive));
      if (!variants.length) return;

      const subcategory = category.subcategories.find((entry) => entry.id === product.subcategoryId) ?? null;
      const prices = variants.map((variant) => resolveVariantPrice(variant, 'retail'));
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const searchText = buildSearchText([
        category.name,
        subcategory?.name,
        product.name,
        product.description,
        ...variants.flatMap((variant) => [
          variant.label,
          variant.sku ?? undefined,
          resolveVariantPrice(variant, 'retail'),
          ...Object.entries(variant.attributes).flatMap(([key, value]) => [key, value]),
        ]),
      ]);

      items.push({
        id: product.id,
        product,
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug ?? null,
          sortOrder: category.sortOrder,
        },
        subcategory,
        variants,
        minPrice,
        maxPrice,
        defaultVariantId: variants[0]?.id ?? null,
        searchText,
      });
    });
  });

  return items;
};

export const sortRetailItems = (items: RetailCatalogItem[], sort: RetailSortOption) => {
  const next = [...items];

  switch (sort) {
    case 'price-asc':
      return next.sort((left, right) => left.minPrice - right.minPrice || left.product.name.localeCompare(right.product.name, 'ru'));
    case 'price-desc':
      return next.sort((left, right) => right.minPrice - left.minPrice || left.product.name.localeCompare(right.product.name, 'ru'));
    case 'name':
      return next.sort((left, right) => left.product.name.localeCompare(right.product.name, 'ru'));
    case 'popular':
    default:
      return next.sort((left, right) => {
        if (left.category.sortOrder !== right.category.sortOrder) {
          return left.category.sortOrder - right.category.sortOrder;
        }
        if (left.product.sortOrder !== right.product.sortOrder) {
          return left.product.sortOrder - right.product.sortOrder;
        }
        return left.product.name.localeCompare(right.product.name, 'ru');
      });
  }
};

export const getRetailCategoryPreviews = (
  categories: CatalogCategory[],
  count = 4
): RetailCategoryPreview[] =>
  categories
    .filter((category) => category.products.length > 0)
    .map((category) => {
      const items = flattenRetailCatalog([category]);
      return {
        id: category.id,
        name: category.name,
        slug: category.slug ?? null,
        productCount: category.products.length,
        subcategoryCount: category.subcategories.length,
        minPrice: items.length ? Math.min(...items.map((item) => item.minPrice)) : null,
        sampleProducts: category.products.slice(0, 3).map((product) => ({
          id: product.id,
          name: product.name,
        })),
      };
    })
    .slice(0, count);

export const getCatalogTotals = (categories: CatalogCategory[]) => ({
  categories: categories.length,
  products: categories.reduce((sum, category) => sum + category.products.length, 0),
  variants: categories.reduce(
    (sum, category) =>
      sum + category.products.reduce((productSum, product) => productSum + product.variants.length, 0),
    0
  ),
});

export const getFeaturedRetailItems = (categories: CatalogCategory[], count = 6) =>
  sortRetailItems(flattenRetailCatalog(categories), 'popular').slice(0, count);
