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
});

const buildUniqueSlug = async (base: string, excludeId?: string) => {
  if (!base) return null;
  let candidate = base;
  let suffix = 2;
  while (candidate) {
    const existing = await prisma.category.findFirst({
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
    return jsonError({ code: 'invalid_id', message: 'Invalid category id.' }, 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErrorFromZod(parsed.error);
  }

  const existing = await prisma.category.findUnique({
    where: { id },
    include: { translations: { where: { locale: Locale.ru } } },
  });
  if (!existing) {
    return jsonError({ code: 'not_found', message: 'Category not found.' }, 404);
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
  } else if (!existing.slug && nextName) {
    const baseSlug = slugify(nextName);
    slug = baseSlug ? await buildUniqueSlug(baseSlug, id) : null;
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(slug !== undefined ? { slug: slug || null } : {}),
    },
    include: { translations: { where: { locale: Locale.ru } } },
  });

  if (parsed.data.name !== undefined) {
    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: id, locale: Locale.ru } },
      update: { name: nextName },
      create: { categoryId: id, locale: Locale.ru, name: nextName },
    });
  }

  return jsonOk({
    category: {
      id: updated.id,
      name: parsed.data.name !== undefined ? nextName : updated.translations[0]?.name ?? nextName,
      slug: updated.slug ?? null,
      sortOrder: updated.sortOrder,
      isActive: updated.isActive,
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
    return jsonError({ code: 'invalid_id', message: 'Invalid category id.' }, 400);
  }

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return jsonError({ code: 'not_found', message: 'Category not found.' }, 404);
  }

  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    return jsonError(
      { code: 'category_has_products', message: 'Нельзя удалить категорию с товарами.' },
      409
    );
  }

  await prisma.$transaction([
    prisma.subcategoryTranslation.deleteMany({ where: { subcategory: { categoryId: id } } }),
    prisma.subcategory.deleteMany({ where: { categoryId: id } }),
    prisma.categoryTranslation.deleteMany({ where: { categoryId: id } }),
    prisma.category.delete({ where: { id } }),
  ]);

  return jsonOk({ categoryId: id });
}
