import { prisma, Locale } from '@plumbing/db';
import { normalizeWhitespace } from '@/lib/importer/normalize';

type Translation = { locale: Locale } & Record<string, unknown>;

export type AdminOrderItemInput = {
  variantId?: string | null;
  productName?: string | null;
  variantLabel?: string | null;
  quantity: number;
  unitPrice?: number;
};

export type AdminOrderItem = {
  variantId?: string;
  productName: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

const pickTranslation = <T extends Translation>(translations: T[], locale: Locale): T | undefined =>
  translations.find((t) => t.locale === locale) ??
  translations.find((t) => t.locale === Locale.ru) ??
  translations.find((t) => t.locale === Locale.en);

const parseInteger = (value: number | undefined) => {
  if (!Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  return value as number;
};

export const buildOrderItems = async ({
  items,
  locale,
}: {
  items: AdminOrderItemInput[];
  locale: Locale;
}) => {
  const sanitized = items.filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);
  if (!sanitized.length) {
    throw new Error('Order items are required.');
  }

  const variantIds = Array.from(
    new Set(
      sanitized
        .map((item) => (item.variantId ? item.variantId.toString() : null))
        .filter((value): value is string => Boolean(value))
    )
  );

  const translationLocales = Array.from(new Set([locale, Locale.ru, Locale.en]));
  const variants = variantIds.length
    ? await prisma.variant.findMany({
        where: { id: { in: variantIds } },
        include: {
          translations: { where: { locale: { in: translationLocales } } },
          product: { include: { translations: { where: { locale: { in: translationLocales } } } } },
        },
      })
    : [];

  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const missingVariants: string[] = [];

  const orderItems: AdminOrderItem[] = [];

  for (const item of sanitized) {
    const quantity = parseInteger(item.quantity);
    if (!quantity || quantity <= 0) {
      throw new Error('Item quantity must be a positive integer.');
    }

    if (item.variantId) {
      const variant = variantsById.get(item.variantId);
      if (!variant) {
        missingVariants.push(item.variantId);
        continue;
      }

      const productTranslation = pickTranslation(variant.product.translations, locale);
      const variantTranslation = pickTranslation(variant.translations, locale);
      const productName = normalizeWhitespace(productTranslation?.name ?? variant.productId);
      const variantLabel = normalizeWhitespace(variantTranslation?.label ?? variant.sku ?? variant.id) || null;

      const unitPrice = parseInteger(item.unitPrice ?? variant.price);
      if (!unitPrice || unitPrice <= 0) {
        throw new Error('Item price must be a positive integer.');
      }

      orderItems.push({
        variantId: variant.id,
        productName,
        variantLabel,
        quantity,
        unitPrice,
        subtotal: unitPrice * quantity,
      });
      continue;
    }

    const productName = normalizeWhitespace(item.productName ?? '');
    if (!productName) {
      throw new Error('Item product name is required.');
    }

    const unitPrice = parseInteger(item.unitPrice);
    if (!unitPrice || unitPrice <= 0) {
      throw new Error('Item price must be a positive integer.');
    }

    const variantLabel = normalizeWhitespace(item.variantLabel ?? '') || null;

    orderItems.push({
      productName,
      variantLabel,
      quantity,
      unitPrice,
      subtotal: unitPrice * quantity,
    });
  }

  if (missingVariants.length > 0) {
    throw new Error(`Variants not found: ${missingVariants.join(', ')}`);
  }

  if (!orderItems.length) {
    throw new Error('Order items are required.');
  }

  const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  return { items: orderItems, total };
};
