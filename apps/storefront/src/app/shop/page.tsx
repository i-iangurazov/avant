import type { Metadata } from 'next';
import { Locale } from '@plumbing/db';
import { getLocale, getTranslations } from 'next-intl/server';
import RetailShopPage from '@/components/retail/RetailShopPage';
import { getCatalogCategories } from '@plumbing/catalog/catalogData';
import { defaultLocale, isLanguage } from '@/lib/i18n';

const resolveLocale = async () => {
  const locale = await getLocale();
  return (isLanguage(locale) ? locale : defaultLocale) as Locale;
};

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations('retail.meta');

  return {
    title: tMeta('shopTitle'),
    description: tMeta('shopDescription'),
  };
}

export default async function ShopPage() {
  const locale = await resolveLocale();
  const categories = await getCatalogCategories(locale);

  return <RetailShopPage categories={categories} />;
}
