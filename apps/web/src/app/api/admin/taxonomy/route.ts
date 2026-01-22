import { prisma, Locale } from '@plumbing/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { jsonOk } from '@/lib/apiResponse';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const includeInactive = url.searchParams.get('includeInactive') === '1';

  const categories = await prisma.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      translations: { where: { locale: Locale.ru } },
      subcategories: {
        where: includeInactive ? {} : { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { translations: { where: { locale: Locale.ru } } },
      },
    },
  });

  const payload = categories.map((category) => ({
    id: category.id,
    slug: category.slug ?? null,
    name: category.translations[0]?.name ?? category.id,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    subcategories: category.subcategories.map((subcategory) => ({
      id: subcategory.id,
      slug: subcategory.slug ?? null,
      name: subcategory.translations[0]?.name ?? subcategory.id,
      sortOrder: subcategory.sortOrder,
      isActive: subcategory.isActive,
      categoryId: subcategory.categoryId,
    })),
  }));

  return jsonOk({ categories: payload });
}
