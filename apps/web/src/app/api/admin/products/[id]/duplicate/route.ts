import { prisma, Locale, Prisma } from '@plumbing/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { jsonError, jsonOk } from '@/lib/apiResponse';
import { normalizeWhitespace } from '@/lib/importer/normalize';
import { slugify } from '@/lib/importer/slug';

export const runtime = 'nodejs';

const buildUniqueSlug = async (base: string) => {
  if (!base) return null;
  let candidate = base;
  let suffix = 2;
  while (candidate) {
    const existing = await prisma.product.findFirst({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return null;
};

const resolveId = async (params: Promise<{ id?: string | string[] }>) => {
  const resolved = await params;
  const value = resolved.id;
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id?: string | string[] }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const id = await resolveId(params);
  if (!id) {
    return jsonError({ code: 'invalid_id', message: 'Invalid product id.' }, 400);
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      translations: true,
      variants: { include: { translations: true } },
      category: { include: { translations: { where: { locale: Locale.ru } } } },
      subcategory: { include: { translations: { where: { locale: Locale.ru } } } },
    },
  });

  if (!product) {
    return jsonError({ code: 'not_found', message: 'Product not found.' }, 404);
  }

  const ruTranslation = product.translations.find((translation) => translation.locale === Locale.ru);
  const fallbackName = normalizeWhitespace(
    ruTranslation?.name ?? product.translations[0]?.name ?? product.id
  );
  const baseName = fallbackName || product.id;
  const ruName = `${baseName} (копия)`;

  const translations = product.translations.map((translation) => ({
    locale: translation.locale,
    name: translation.locale === Locale.ru ? ruName : translation.name,
    description: translation.description ?? null,
  }));

  if (!translations.some((translation) => translation.locale === Locale.ru)) {
    translations.push({ locale: Locale.ru, name: ruName, description: null });
  }

  const slugInput = normalizeWhitespace(ruName);
  const baseSlug = slugify(slugInput);
  const slug = baseSlug ? await buildUniqueSlug(baseSlug) : null;

  const minSort = await prisma.product.aggregate({ _min: { sortOrder: true } });
  const sortOrder = (minSort._min.sortOrder ?? 0) - 1;

  const duplicate = await prisma.product.create({
    data: {
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId ?? null,
      sortOrder,
      slug: slug || undefined,
      imageUrl: product.imageUrl ?? null,
      description: product.description ?? null,
      isActive: true,
      translations: { create: translations },
      variants: {
        create: product.variants.map((variant) => ({
          price: variant.price,
          priceRetail: variant.priceRetail ?? variant.price,
          sku: null,
          isActive: true,
          attributes: (variant.attributes ?? {}) as Prisma.InputJsonValue,
          translations: {
            create: variant.translations.map((translation) => ({
              locale: translation.locale,
              label: translation.label,
            })),
          },
        })),
      },
    },
    include: {
      translations: { where: { locale: Locale.ru } },
      category: { include: { translations: { where: { locale: Locale.ru } } } },
      subcategory: { include: { translations: { where: { locale: Locale.ru } } } },
      _count: { select: { variants: true } },
    },
  });

  return jsonOk({
    product: {
      id: duplicate.id,
      name: duplicate.translations[0]?.name ?? ruName,
      category: {
        id: duplicate.categoryId,
        name: duplicate.category.translations[0]?.name ?? duplicate.categoryId,
      },
      subcategory: duplicate.subcategory
        ? {
            id: duplicate.subcategory.id,
            name: duplicate.subcategory.translations[0]?.name ?? duplicate.subcategory.id,
          }
        : null,
      imageUrl: duplicate.imageUrl ?? null,
      sortOrder: duplicate.sortOrder,
      isActive: duplicate.isActive,
      variantCount: duplicate._count.variants,
    },
  });
}
