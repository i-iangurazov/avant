import { NextResponse } from 'next/server';
import { Locale } from '@plumbing/db';
import { isLanguage } from '@/lib/i18n';
import { getCatalogCategories } from '@plumbing/catalog/catalogData';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const localeParam = url.searchParams.get('locale');
  const locale = isLanguage(localeParam) ? (localeParam as Locale) : Locale.en;
  const categories = await getCatalogCategories(locale);
  return NextResponse.json({ categories });
}
