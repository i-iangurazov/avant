import { z } from 'zod';
import { prisma, Locale } from '@plumbing/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { jsonError, jsonErrorFromZod, jsonOk } from '@/lib/apiResponse';
import { normalizeWhitespace } from '@/lib/importer/normalize';
import { slugify } from '@/lib/importer/slug';

export const runtime = 'nodejs';

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const buildUniqueSlug = async (base: string) => {
  if (!base) return null;
  let candidate = base;
  let suffix = 2;
  while (candidate) {
    const existing = await prisma.category.findFirst({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return null;
};

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return jsonErrorFromZod(parsed.error);
  }

  const name = normalizeWhitespace(parsed.data.name);
  if (!name) {
    return jsonError({ code: 'name_required', message: 'Name is required.' }, 400);
  }

  const slugInput = normalizeWhitespace(parsed.data.slug ?? '');
  const baseSlug = slugify(slugInput || name);
  const slug = baseSlug ? await buildUniqueSlug(baseSlug) : null;

  const maxSort = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const sortOrder = parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1;

  const category = await prisma.category.create({
    data: {
      sortOrder,
      slug: slug || undefined,
      isActive: parsed.data.isActive ?? true,
      translations: { create: [{ locale: Locale.ru, name }] },
    },
    include: { translations: { where: { locale: Locale.ru } } },
  });

  return jsonOk({
    category: {
      id: category.id,
      name: category.translations[0]?.name ?? name,
      slug: category.slug ?? null,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    },
  });
}
