import { buildSearchText, matchesSearchTextPrefix, normalizeSearchValue } from './search';

export type CatalogVariant = {
  id: string;
  productId: string;
  label: string;
  price: number;
  priceRetail: number;
  sku?: string | null;
  attributes: Record<string, string | number>;
  isActive: boolean;
};

export type CatalogProduct = {
  id: string;
  categoryId: string;
  subcategoryId?: string | null;
  slug?: string | null;
  sortOrder: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  variants: CatalogVariant[];
};

export type CatalogSubcategory = {
  id: string;
  slug?: string | null;
  sortOrder: number;
  name: string;
};

export type CatalogCategory = {
  id: string;
  slug?: string | null;
  sortOrder: number;
  name: string;
  subcategories: CatalogSubcategory[];
  products: CatalogProduct[];
};

export type CatalogResponse = {
  categories: CatalogCategory[];
};

export type SearchEntry = {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  subtitle: string;
  price: number;
  sku?: string;
  searchText: string;
  primarySearchText: string;
  secondarySearchText: string;
};

export const indexCatalog = (categories: CatalogCategory[]) => {
  const productsById: Record<string, CatalogProduct> = {};
  const variantsById: Record<string, CatalogVariant> = {};
  const variantsByProductId: Record<string, CatalogVariant[]> = {};

  categories.forEach((category) => {
    category.products.forEach((product) => {
      productsById[product.id] = product;
      variantsByProductId[product.id] = product.variants;
      product.variants.forEach((variant) => {
        variantsById[variant.id] = variant;
      });
    });
  });

  return { productsById, variantsById, variantsByProductId };
};

export const buildSearchEntries = (
  variants: CatalogVariant[],
  productsById: Record<string, CatalogProduct>
): SearchEntry[] =>
  variants.map((variant) => {
    const product = productsById[variant.productId];
    const title = product?.name ?? variant.productId;
    const subtitle = variant.label;
    const sku = variant.sku ?? undefined;
    const primarySearchText = buildSearchText([title]);
    const secondarySearchText = buildSearchText(
      [subtitle, product?.description, product?.slug, product?.categoryId, product?.subcategoryId, sku],
      variant.attributes
    );
    const searchText = `${primarySearchText}${secondarySearchText}`;
    return {
      id: variant.id,
      productId: variant.productId,
      variantId: variant.id,
      title,
      subtitle,
      price: variant.price,
      sku,
      searchText,
      primarySearchText,
      secondarySearchText,
    };
  });

const scorePrimaryNamePhrase = (title: string, query: string) => {
  const normalizedTitle = normalizeSearchValue(title);
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedTitle || !normalizedQuery) return 0;
  if (normalizedTitle === normalizedQuery) return 600;
  if (normalizedTitle.startsWith(normalizedQuery)) return 500;
  if (normalizedTitle.includes(normalizedQuery)) return 420;
  return 0;
};

export const scoreSearchEntry = (entry: SearchEntry, query: string) => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return 0;

  if (matchesSearchTextPrefix(entry.primarySearchText, trimmedQuery)) {
    return 1000 + scorePrimaryNamePhrase(entry.title, trimmedQuery);
  }

  if (matchesSearchTextPrefix(entry.secondarySearchText, trimmedQuery)) {
    const normalizedQuery = normalizeSearchValue(trimmedQuery);
    const normalizedSku = entry.sku ? normalizeSearchValue(entry.sku) : '';
    const skuBoost = normalizedSku && normalizedSku.startsWith(normalizedQuery) ? 120 : 0;
    return 300 + skuBoost;
  }

  return 0;
};

export const searchCatalogEntries = (entries: SearchEntry[], query: string, limit = 8) =>
  entries
    .map((entry, index) => ({ entry, index, score: scoreSearchEntry(entry, query) }))
    .filter((result) => result.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const titleCompare = left.entry.title.localeCompare(right.entry.title, 'ru');
      if (titleCompare !== 0) return titleCompare;
      const subtitleCompare = left.entry.subtitle.localeCompare(right.entry.subtitle, 'ru');
      if (subtitleCompare !== 0) return subtitleCompare;
      return left.index - right.index;
    })
    .slice(0, limit)
    .map((result) => result.entry);

export const filterCatalog = (
  categories: CatalogCategory[],
  selectedCategoryId: string,
  selectedSubcategoryId: string
) => {
  const filtered =
    selectedCategoryId === 'all'
      ? categories
      : categories.filter((category) => category.id === selectedCategoryId);

  if (selectedSubcategoryId === 'all') return filtered;
  return filtered
    .map((category) => ({
      ...category,
      products: category.products.filter((product) => product.subcategoryId === selectedSubcategoryId),
    }))
    .filter((category) => category.subcategories.some((subcategory) => subcategory.id === selectedSubcategoryId));
};
