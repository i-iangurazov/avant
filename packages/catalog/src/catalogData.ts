import { Locale, prisma } from '@plumbing/db';
import type { CatalogCategory } from './catalogApi';
import { normalizeCatalogImageUrl } from './images';

type Translation = { locale: Locale } & Record<string, unknown>;

const pickTranslation = <T extends Translation>(translations: T[], locale: Locale): T | undefined =>
  translations.find((translation) => translation.locale === locale) ??
  translations.find((translation) => translation.locale === Locale.ru) ??
  translations.find((translation) => translation.locale === Locale.en);

const normalizeAttributes = (value: unknown): Record<string, string | number> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, string | number>;
};

export const getCatalogCategories = async (locale: Locale): Promise<CatalogCategory[]> => {
  const translationLocales = Array.from(new Set([locale, Locale.ru, Locale.en]));

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      translations: { where: { locale: { in: translationLocales } } },
      subcategories: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          translations: { where: { locale: { in: translationLocales } } },
        },
      },
      products: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        include: {
          translations: { where: { locale: { in: translationLocales } } },
          variants: {
            where: { isActive: true },
            orderBy: { id: 'asc' },
            include: {
              translations: { where: { locale: { in: translationLocales } } },
            },
          },
        },
      },
    },
  });

  return categories.map((category) => {
    const categoryTranslation = pickTranslation(category.translations, locale);

    return {
      id: category.id,
      slug: category.slug ?? null,
      sortOrder: category.sortOrder,
      name: categoryTranslation?.name ?? category.id,
      subcategories: category.subcategories.map((subcategory) => {
        const subcategoryTranslation = pickTranslation(subcategory.translations, locale);

        return {
          id: subcategory.id,
          slug: subcategory.slug ?? null,
          sortOrder: subcategory.sortOrder,
          name: subcategoryTranslation?.name ?? subcategory.id,
        };
      }),
      products: category.products.map((product) => {
        const productTranslation = pickTranslation(product.translations, locale);

        return {
          id: product.id,
          categoryId: product.categoryId,
          subcategoryId: product.subcategoryId ?? null,
          slug: product.slug ?? null,
          sortOrder: product.sortOrder,
          name: productTranslation?.name ?? product.id,
          description: productTranslation?.description ?? product.description ?? null,
          imageUrl: normalizeCatalogImageUrl(product.imageUrl),
          variants: product.variants.map((variant) => {
            const variantTranslation = pickTranslation(variant.translations, locale);

            return {
              id: variant.id,
              productId: variant.productId,
              label: variantTranslation?.label ?? variant.id,
              price: variant.price,
              priceRetail: variant.priceRetail,
              sku: variant.sku,
              attributes: normalizeAttributes(variant.attributes),
              isActive: variant.isActive,
            };
          }),
        };
      }),
    };
  });
};
