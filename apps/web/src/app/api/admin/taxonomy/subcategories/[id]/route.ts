import { z } from 'zod';
import { prisma, Locale } from '@plumbing/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { jsonError, jsonErrorFromZod, jsonOk } from '@/lib/apiResponse';
import { normalizeWhitespace } from '@/lib/importer/normalize';
import { slugify } from '@/lib/importer/slug';

export const runtime = 'nodejs';

const updateSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  categoryId: z.string().optional(),
});

const buildUniqueSlug = async (base: string, excludeId?: string) => {
  if (!base) return null;
  let candidate = base;
  let suffix = 2;
  while (candidate) {
    const existing = await prisma.subcategory.findFirst({
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id?: string | string[] }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const id = await resolveId(params);
  if (!id) {
    return jsonError({ code: 'invalid_id', message: 'Invalid subcategory id.' }, 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErrorFromZod(parsed.error);
  }

  const existing = await prisma.subcategory.findUnique({
    where: { id },
    include: {
      translations: { where: { locale: Locale.ru } },
      category: { include: { translations: { where: { locale: Locale.ru } } } },
    },
  });
  if (!existing) {
    return jsonError({ code: 'not_found', message: 'Subcategory not found.' }, 404);
  }

  let category = existing.category;
  if (parsed.data.categoryId && parsed.data.categoryId !== existing.categoryId) {
    const nextCategory = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
      include: { translations: { where: { locale: Locale.ru } } },
    });
    if (!nextCategory) {
      return jsonError({ code: 'category_not_found', message: 'Category not found.' }, 404);
    }
    category = nextCategory;
  }

  const nextName =
    parsed.data.name !== undefined
      ? normalizeWhitespace(parsed.data.name)
      : existing.translations[0]?.name ?? '';

  if (parsed.data.name !== undefined && !nextName) {
    return jsonError({ code: 'name_required', message: 'Name is required.' }, 400);
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
  } else if (!existing.slug || parsed.data.categoryId !== undefined || parsed.data.name !== undefined) {
    const categoryName = category.translations[0]?.name ?? '';
    const baseSlug = slugify(`${categoryName}-${nextName}`);
    slug = baseSlug ? await buildUniqueSlug(baseSlug, id) : null;
  }

  const updated = await prisma.subcategory.update({
    where: { id },
    data: {
      ...(parsed.data.categoryId ? { categoryId: parsed.data.categoryId } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(slug !== undefined ? { slug: slug || null } : {}),
    },
    include: { translations: { where: { locale: Locale.ru } } },
  });

  if (parsed.data.name !== undefined) {
    await prisma.subcategoryTranslation.upsert({
      where: { subcategoryId_locale: { subcategoryId: id, locale: Locale.ru } },
      update: { name: nextName },
      create: { subcategoryId: id, locale: Locale.ru, name: nextName },
    });
  }

  return jsonOk({
    subcategory: {
      id: updated.id,
      name: parsed.data.name !== undefined ? nextName : updated.translations[0]?.name ?? nextName,
      slug: updated.slug ?? null,
      sortOrder: updated.sortOrder,
      isActive: updated.isActive,
      categoryId: updated.categoryId,
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id?: string | string[] }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const id = await resolveId(params);
  if (!id) {
    return jsonError({ code: 'invalid_id', message: 'Invalid subcategory id.' }, 400);
  }

  const existing = await prisma.subcategory.findUnique({ where: { id } });
  if (!existing) {
    return jsonError({ code: 'not_found', message: 'Subcategory not found.' }, 404);
  }

  const productCount = await prisma.product.count({ where: { subcategoryId: id } });
  if (productCount > 0) {
    return jsonError(
      { code: 'subcategory_has_products', message: 'Нельзя удалить подкатегорию с товарами.' },
      409
    );
  }

  await prisma.$transaction([
    prisma.subcategoryTranslation.deleteMany({ where: { subcategoryId: id } }),
    prisma.subcategory.delete({ where: { id } }),
  ]);

  return jsonOk({});
}
