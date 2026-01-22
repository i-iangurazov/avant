import { z } from 'zod';
import { prisma, Locale, Prisma } from '@plumbing/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { jsonError, jsonErrorFromZod, jsonOk } from '@/lib/apiResponse';
import { normalizeWhitespace } from '@/lib/importer/normalize';
import { slugify } from '@/lib/importer/slug';

export const runtime = 'nodejs';

const variantSchema = z.object({
  label: z.string().min(1),
  price: z.number().int().positive(),
  sku: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const productSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
  subcategoryId: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  variants: z.array(variantSchema).min(1),
});

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

const parsePageNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = normalizeWhitespace(url.searchParams.get('q') ?? '');
  const categoryId = url.searchParams.get('categoryId');
  const page = parsePageNumber(url.searchParams.get('page'), 1);
  const pageSize = Math.min(parsePageNumber(url.searchParams.get('pageSize'), 20), 100);

  const where: Prisma.ProductWhereInput = {
    ...(q
      ? {
          translations: {
            some: {
              locale: Locale.ru,
              name: { contains: q, mode: Prisma.QueryMode.insensitive },
            },
          },
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
  };

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        translations: { where: { locale: Locale.ru } },
        category: { include: { translations: { where: { locale: Locale.ru } } } },
        subcategory: { include: { translations: { where: { locale: Locale.ru } } } },
        _count: { select: { variants: true } },
      },
    }),
  ]);

  const items = products.map((product) => ({
    id: product.id,
    name: product.translations[0]?.name ?? product.id,
    category: {
      id: product.categoryId,
      name: product.category.translations[0]?.name ?? product.categoryId,
    },
    subcategory: product.subcategory
      ? {
          id: product.subcategory.id,
          name: product.subcategory.translations[0]?.name ?? product.subcategory.id,
        }
      : null,
    imageUrl: product.imageUrl ?? null,
    sortOrder: product.sortOrder,
    isActive: product.isActive,
    variantCount: product._count.variants,
  }));

  return jsonOk({ items, page, pageSize, total });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErrorFromZod(parsed.error);
  }

  const name = normalizeWhitespace(parsed.data.name);
  if (!name) {
    return jsonError({ code: 'name_required', message: 'Name is required.' }, 400);
  }

  const variants = parsed.data.variants.map((variant) => ({
    label: normalizeWhitespace(variant.label),
    price: variant.price,
    sku: normalizeWhitespace(variant.sku ?? '') || null,
    isActive: variant.isActive ?? true,
  }));

  if (!variants.length || variants.some((variant) => !variant.label || variant.price <= 0)) {
    return jsonError({ code: 'invalid_variants', message: 'Variants are invalid.' }, 400);
  }

  const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) {
    return jsonError({ code: 'category_not_found', message: 'Category not found.' }, 404);
  }

  if (parsed.data.subcategoryId) {
    const subcategory = await prisma.subcategory.findUnique({ where: { id: parsed.data.subcategoryId } });
    if (!subcategory || subcategory.categoryId !== parsed.data.categoryId) {
      return jsonError({ code: 'subcategory_invalid', message: 'Subcategory is invalid.' }, 400);
    }
  }

  const slugInput = normalizeWhitespace(parsed.data.slug ?? '');
  const baseSlug = slugify(slugInput || name);
  const slug = baseSlug ? await buildUniqueSlug(baseSlug) : null;

  const maxSort = await prisma.product.aggregate({
    where: { categoryId: parsed.data.categoryId },
    _max: { sortOrder: true },
  });
  const sortOrder = parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1;

  const product = await prisma.product.create({
    data: {
      categoryId: parsed.data.categoryId,
      subcategoryId: parsed.data.subcategoryId ?? null,
      sortOrder,
      slug: slug || undefined,
      imageUrl: parsed.data.imageUrl ?? null,
      isActive: parsed.data.isActive ?? true,
      translations: { create: [{ locale: Locale.ru, name }] },
      variants: {
        create: variants.map((variant) => ({
          price: variant.price,
          priceRetail: variant.price,
          sku: variant.sku ?? null,
          isActive: variant.isActive,
          attributes: {},
          translations: { create: [{ locale: Locale.ru, label: variant.label }] },
        })),
      },
    },
    include: {
      translations: { where: { locale: Locale.ru } },
      variants: { include: { translations: { where: { locale: Locale.ru } } } },
    },
  });

  return jsonOk({
    product: {
      id: product.id,
      name: product.translations[0]?.name ?? name,
      imageUrl: product.imageUrl ?? null,
      isActive: product.isActive,
    },
  });
}
