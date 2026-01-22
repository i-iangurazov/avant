import { NextResponse } from 'next/server';
import { prisma, Locale, Prisma } from '@plumbing/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { jsonError, jsonOk } from '@/lib/apiResponse';
import { parseTaxonomyCsv, parseTaxonomyWorkbook } from '@/lib/taxonomy/parser';
import { slugify } from '@/lib/importer/slug';
import { normalizeWhitespace } from '@/lib/importer/normalize';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const isCsvFile = (file: File) => file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv');
const isXlsxFile = (file: File) =>
  file.name.toLowerCase().endsWith('.xlsx') ||
  file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const buildReport = (params: { categories: number; subcategories: number }) => ({
  totals: {
    categories: params.categories,
    subcategories: params.subcategories,
  },
  created: {
    categories: 0,
    subcategories: 0,
  },
  updated: {
    categories: 0,
    subcategories: 0,
  },
  skipped: {
    categories: 0,
    subcategories: 0,
  },
});

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');
  const isPreview = mode === 'preview';
  const isSync = mode === 'sync';

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError({ code: 'invalid_payload', message: 'Invalid payload.' }, 400);
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return jsonError({ code: 'file_required', message: 'File is required.' }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonError({ code: 'file_too_large', message: 'File is too large.' }, 413);
  }

  if (!isCsvFile(file) && !isXlsxFile(file)) {
    return jsonError({ code: 'unsupported_file', message: 'Unsupported file type.' }, 415);
  }

  let parsed;
  if (isCsvFile(file)) {
    const content = await file.text();
    parsed = parseTaxonomyCsv(content);
  } else {
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed = parseTaxonomyWorkbook(buffer);
  }

  const totals = {
    categories: parsed.categories.length,
    subcategories: parsed.categories.reduce((sum, category) => sum + category.subcategories.length, 0),
  };

  if (isPreview) {
    return jsonOk({
      preview: true,
      warnings: parsed.warnings,
      errors: parsed.errors,
      report: buildReport(totals),
    });
  }

  if (parsed.errors.length) {
    const error = { code: 'parse_failed', message: 'Failed to parse taxonomy file.' };
    return NextResponse.json(
      { ok: false, error, message: error.message, errors: parsed.errors },
      { status: 400 }
    );
  }

  const report = buildReport(totals);

  const importedCategoryIds = new Set<string>();
  const importedSubcategoryIds = new Set<string>();

  for (const category of parsed.categories) {
    const name = normalizeWhitespace(category.name);
    if (!name) {
      report.skipped.categories += 1;
      continue;
    }

    const slug = slugify(name);
    const existing =
      (slug
        ? await prisma.category.findFirst({ where: { slug }, include: { translations: true } })
        : null) ??
      (await prisma.category.findFirst({
        where: {
          translations: {
            some: { locale: Locale.ru, name: { equals: name, mode: Prisma.QueryMode.insensitive } },
          },
        },
        include: { translations: true },
      }));

    let categoryId: string;
    if (existing) {
      categoryId = existing.id;
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          sortOrder: category.sortOrder,
          isActive: true,
          slug: existing.slug ? undefined : slug || undefined,
        },
      });
      report.updated.categories += 1;
    } else {
      const created = await prisma.category.create({
        data: {
          sortOrder: category.sortOrder,
          isActive: true,
          slug: slug || undefined,
          translations: { create: [{ locale: Locale.ru, name }] },
        },
      });
      categoryId = created.id;
      report.created.categories += 1;
    }

    importedCategoryIds.add(categoryId);

    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId, locale: Locale.ru } },
      update: { name },
      create: { categoryId, locale: Locale.ru, name },
    });

    for (const subcategory of category.subcategories) {
      const subName = normalizeWhitespace(subcategory.name);
      if (!subName) {
        report.skipped.subcategories += 1;
        continue;
      }

      const subSlug = slugify(`${name}-${subName}`);
      const existingSub =
        (subSlug
          ? await prisma.subcategory.findFirst({ where: { slug: subSlug }, include: { translations: true } })
          : null) ??
        (await prisma.subcategory.findFirst({
          where: {
            categoryId,
            translations: {
              some: { locale: Locale.ru, name: { equals: subName, mode: Prisma.QueryMode.insensitive } },
            },
          },
          include: { translations: true },
        }));

      let subcategoryId: string;
      if (existingSub) {
        subcategoryId = existingSub.id;
        await prisma.subcategory.update({
          where: { id: existingSub.id },
          data: {
            sortOrder: subcategory.sortOrder,
            isActive: true,
            slug: existingSub.slug ? undefined : subSlug || undefined,
          },
        });
        report.updated.subcategories += 1;
      } else {
        const createdSub = await prisma.subcategory.create({
          data: {
            categoryId,
            sortOrder: subcategory.sortOrder,
            isActive: true,
            slug: subSlug || undefined,
            translations: { create: [{ locale: Locale.ru, name: subName }] },
          },
        });
        subcategoryId = createdSub.id;
        report.created.subcategories += 1;
      }

      importedSubcategoryIds.add(subcategoryId);

      await prisma.subcategoryTranslation.upsert({
        where: { subcategoryId_locale: { subcategoryId, locale: Locale.ru } },
        update: { name: subName },
        create: { subcategoryId, locale: Locale.ru, name: subName },
      });
    }
  }

  if (isSync) {
    const categoryIds = Array.from(importedCategoryIds);
    const subcategoryIds = Array.from(importedSubcategoryIds);

    await prisma.category.updateMany({
      where: { id: { notIn: categoryIds } },
      data: { isActive: false },
    });
    if (categoryIds.length) {
      await prisma.category.updateMany({
        where: { id: { in: categoryIds } },
        data: { isActive: true },
      });
    }

    await prisma.subcategory.updateMany({
      where: { id: { notIn: subcategoryIds } },
      data: { isActive: false },
    });
    if (subcategoryIds.length) {
      await prisma.subcategory.updateMany({
        where: { id: { in: subcategoryIds } },
        data: { isActive: true },
      });
    }
  }

  return jsonOk({
    warnings: parsed.warnings,
    report,
  });
}
