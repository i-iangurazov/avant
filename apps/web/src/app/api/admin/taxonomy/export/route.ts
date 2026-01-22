import { NextResponse } from 'next/server';
import { prisma, Locale } from '@plumbing/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      translations: { where: { locale: Locale.ru } },
      subcategories: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { translations: { where: { locale: Locale.ru } } },
      },
    },
  });

  const lines = ['category_ru;subcategory_ru'];
  categories.forEach((category) => {
    const categoryName = category.translations[0]?.name ?? category.id;
    if (!category.subcategories.length) {
      lines.push(`${categoryName};`);
      return;
    }
    category.subcategories.forEach((subcategory) => {
      const subName = subcategory.translations[0]?.name ?? subcategory.id;
      lines.push(`${categoryName};${subName}`);
    });
  });

  const csv = lines.join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="taxonomy.csv"',
    },
  });
}
