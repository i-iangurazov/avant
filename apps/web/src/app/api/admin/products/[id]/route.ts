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

const buildUniqueSlug = async (base: string, excludeId?: string) => {
  if (!base) return null;
  let candidate = base;
  let suffix = 2;
  while (candidate) {
    const existing = await prisma.product.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
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

export async function GET(
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
      translations: { where: { locale: Locale.ru } },
      category: { include: { translations: { where: { locale: Locale.ru } } } },
      subcategory: { include: { translations: { where: { locale: Locale.ru } } } },
      variants: {
        orderBy: { id: 'asc' },
        include: { translations: { where: { locale: Locale.ru } } },
      },
    },
  });

  if (!product) {
    return jsonError({ code: 'not_found', message: 'Product not found.' }, 404);
  }

  return jsonOk({
    product: {
      id: product.id,
      name: product.translations[0]?.name ?? product.id,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId ?? null,
      imageUrl: product.imageUrl ?? null,
      sortOrder: product.sortOrder,
      isActive: product.isActive,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        label: variant.translations[0]?.label ?? variant.id,
        price: variant.price,
        sku: variant.sku ?? null,
        isActive: variant.isActive,
      })),
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id?: string | string[] }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const id = await resolveId(params);
  if (!id) {
    return jsonError({ code: 'invalid_id', message: 'Invalid product id.' }, 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErrorFromZod(parsed.error);
  }

  const existing = await prisma.product.findUnique({
    where: { id },
    include: { translations: { where: { locale: Locale.ru } } },
  });
  if (!existing) {
    return jsonError({ code: 'not_found', message: 'Product not found.' }, 404);
  }

  const name = normalizeWhitespace(parsed.data.name);
  if (!name) {
    return jsonError({ code: 'name_required', message: 'Name is required.' }, 400);
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

  const variants = parsed.data.variants.map((variant) => ({
    label: normalizeWhitespace(variant.label),
    price: variant.price,
    sku: normalizeWhitespace(variant.sku ?? '') || null,
    isActive: variant.isActive ?? true,
  }));

  if (!variants.length || variants.some((variant) => !variant.label || variant.price <= 0)) {
    return jsonError({ code: 'invalid_variants', message: 'Variants are invalid.' }, 400);
  }

  let slug: string | null | undefined = undefined;
  if (parsed.data.slug !== undefined) {
    const slugInput = normalizeWhitespace(parsed.data.slug ?? '');
    if (!slugInput) {
      slug = null;
    } else {
      const baseSlug = slugify(slugInput);
      slug = baseSlug ? await buildUniqueSlug(baseSlug, id) : null;
    }
  } else if (!existing.slug) {
    const baseSlug = slugify(name);
    slug = baseSlug ? await buildUniqueSlug(baseSlug, id) : null;
  }

  const sortOrder = parsed.data.sortOrder ?? existing.sortOrder;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        categoryId: parsed.data.categoryId,
        subcategoryId: parsed.data.subcategoryId ?? null,
        sortOrder,
        slug: slug === undefined ? existing.slug : slug,
        imageUrl: parsed.data.imageUrl ?? null,
        isActive: parsed.data.isActive ?? existing.isActive,
      },
    });

    await tx.productTranslation.upsert({
      where: { productId_locale: { productId: id, locale: Locale.ru } },
      update: { name },
      create: { productId: id, locale: Locale.ru, name },
    });

    await tx.variantTranslation.deleteMany({
      where: { variant: { productId: id } },
    });
    await tx.variant.deleteMany({ where: { productId: id } });

    for (const variant of variants) {
      await tx.variant.create({
        data: {
          productId: id,
          price: variant.price,
          priceRetail: variant.price,
          sku: variant.sku ?? null,
          isActive: variant.isActive,
          attributes: {},
          translations: { create: [{ locale: Locale.ru, label: variant.label }] },
        },
      });
    }
  });

  return jsonOk({ productId: id });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id?: string | string[] }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const id = await resolveId(params);
  if (!id) {
    return jsonError({ code: 'invalid_id', message: 'Invalid product id.' }, 400);
  }

  const existing = await prisma.product.findUnique({
    where: { id },
    include: { variants: { select: { id: true } } },
  });
  if (!existing) {
    return jsonError({ code: 'not_found', message: 'Product not found.' }, 404);
  }

  const variantIds = existing.variants.map((variant) => variant.id);
  if (variantIds.length > 0) {
    const ordersWithVariant = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "Order"
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements("items") AS item
        WHERE item->>'variantId' IN (${Prisma.join(variantIds)})
      )
      LIMIT 1
    `;
    if (ordersWithVariant.length > 0) {
      return jsonError(
        { code: 'product_has_orders', message: 'Нельзя удалить товар, который используется в заказах.' },
        409
      );
    }
  }

  await prisma.$transaction([
    prisma.variantTranslation.deleteMany({ where: { variant: { productId: id } } }),
    prisma.variant.deleteMany({ where: { productId: id } }),
    prisma.productTranslation.deleteMany({ where: { productId: id } }),
    prisma.product.delete({ where: { id } }),
  ]);

  return jsonOk({ productId: id });
}
