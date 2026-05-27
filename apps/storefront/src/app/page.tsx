import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Locale } from '@plumbing/db';
import { ArrowRight, BadgePercent, ExternalLink, Layers3, MapPin, PackageCheck, Search, ShieldCheck, Store } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import RetailSiteFooter from '@/components/retail/RetailSiteFooter';
import RetailSiteHeader from '@/components/retail/RetailSiteHeader';
import { Button } from '@/components/ui/button';
import { getCachedCatalogCategories } from '@/lib/retail/cachedCatalog';
import { defaultLocale, isLanguage } from '@/lib/i18n';
import {
  getCatalogTotals,
  getFeaturedRetailItems,
  getRetailCategoryPreviews,
} from '@/lib/retail/catalog';
import { capitalizeCategory } from '@/lib/categoryUtils';
import { BLUR_DARK, BLUR_SLATE } from '@/lib/imagePlaceholder';

const resolveLocale = async () => {
  const locale = await getLocale();
  return (isLanguage(locale) ? locale : defaultLocale) as Locale;
};

const storefrontShopPath = '/shop';

/** Store locations shown in the "Наши магазины" section. */
const STORE_LOCATIONS = [
  { label: 'Магазин 1', address: 'Безымянная улица, 20/4, 6 ряд, 46С контейнер, Бишкек' },
  { label: 'Магазин 2', address: 'Улица Ибраимова, 66, 3 ряд, 73, 76 бутик, Бишкек' },
  { label: 'Магазин 3', address: 'Улица Льва Толстого, 19, 1 этаж, 46-48 контейнер, Бишкек' },
  { label: 'Магазин 4', address: 'Табылга, проспект Жибек-Жолу, 150, 1 этаж, Б16, Б17 бутик, Бишкек' },
  { label: 'Магазин 5', address: 'Улица Орозбекова, 354, 1 этаж, Бишкек' },
  { label: 'Магазин 6', address: 'Улица Евразия, 4, 7 контейнер, Бишкек' },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations('retail.meta');

  return {
    title: tMeta('homeTitle'),
    description: tMeta('homeDescription'),
  };
}

export default async function HomePage() {
  const locale = await resolveLocale();
  const tHome = await getTranslations('retail.home');
  const tHeader = await getTranslations('retail.header');
  const categories = await getCachedCatalogCategories(locale);
  const totals = getCatalogTotals(categories);
  const featuredItems = getFeaturedRetailItems(categories, 6);
  const categoryPreviews = getRetailCategoryPreviews(categories, 4);
  const categoryLinks = categories
    .filter((category) => category.products.length > 0)
    .slice(0, 4)
    .map((category) => ({
      href: `${storefrontShopPath}?category=${encodeURIComponent(category.slug ?? category.id)}`,
      label: capitalizeCategory(category.name),
    }));

  const valueCards = [
    {
      icon: BadgePercent,
      title: tHome('valuePriceTitle'),
      description: tHome('valuePriceDescription'),
    },
    {
      icon: ShieldCheck,
      title: tHome('valueTrustTitle'),
      description: tHome('valueTrustDescription'),
    },
    {
      icon: PackageCheck,
      title: tHome('valueRangeTitle'),
      description: tHome('valueRangeDescription'),
    },
  ];

  const guideCards = [
    {
      icon: Search,
      title: tHome('guideSearchTitle'),
      description: tHome('guideSearchDescription'),
    },
    {
      icon: Layers3,
      title: tHome('guideCompareTitle'),
      description: tHome('guideCompareDescription'),
    },
    {
      icon: Store,
      title: tHome('guideVisitTitle'),
      description: tHome('guideVisitDescription'),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-foreground">
      <RetailSiteHeader />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="relative isolate overflow-hidden border-b border-slate-900 bg-slate-950 text-white">
          <Image
            src="/retail/plumbing-hero.webp"
            alt={tHome('heroImageAlt')}
            fill
            sizes="100vw"
            className="absolute inset-0 -z-20 object-cover"
            priority
            placeholder="blur"
            blurDataURL={BLUR_DARK}
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,6,23,0.92)_0%,rgba(15,23,42,0.72)_48%,rgba(15,23,42,0.42)_100%)]" />

          <div className="mx-auto w-full max-w-7xl px-4 py-14 md:px-6 md:py-18 lg:py-22">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase text-white/78 backdrop-blur">
                <MapPin className="size-3.5" />
                <span>{tHeader('city')}</span>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] md:text-6xl">
                  {tHome('title')}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-white/78 md:text-lg">
                  {tHome('subtitle')}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-md px-5">
                  <Link href={storefrontShopPath}>
                    <span>{tHome('primaryCta')}</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>

              {/* Stats: categories + products only (no price displayed) */}
              <div className="grid max-w-4xl gap-3 pt-3 sm:grid-cols-2">
                <div className="rounded-md border border-white/16 bg-white/10 px-4 py-4 backdrop-blur">
                  <div className="text-xs uppercase text-white/55">{tHome('statsCategories')}</div>
                  <div className="mt-1 text-3xl font-semibold">{totals.categories}</div>
                </div>
                <div className="rounded-md border border-white/16 bg-white/10 px-4 py-4 backdrop-blur">
                  <div className="text-xs uppercase text-white/55">{tHome('statsProducts')}</div>
                  <div className="mt-1 text-3xl font-semibold">{totals.products}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Наши магазины ────────────────────────────────────────── */}
        <section className="border-b border-border bg-white">
          <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
            {/* Section heading */}
            <div className="mb-6">
              <div className="text-sm font-semibold uppercase text-primary">{tHeader('city')}</div>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950 md:text-3xl">{tHome('storesTitle')}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{tHome('storesSubtitle')}</p>
            </div>

            {/* 2 columns on desktop, 1 on mobile */}
            <div className="grid gap-4 md:grid-cols-2">
              {STORE_LOCATIONS.map(({ address }, index) => (
                <div
                  key={address}
                  className="flex gap-4 rounded-md border border-border bg-slate-50 p-5 shadow-sm"
                >
                  {/* Map-pin icon */}
                  <div className="mt-0.5 shrink-0">
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MapPin className="size-4" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-sm font-medium text-slate-950">
                      {tHome('storeLabel', { number: index + 1 })}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{address}</p>
                    <a
                      href={`https://2gis.kg/bishkek/search/${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                    >
                      <ExternalLink className="size-3" />
                      {tHome('storesOpen2gis')}
                    </a>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── Category quick-links ──────────────────────────────────── */}
        <section className="border-b border-border bg-white">
          <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-7 md:grid-cols-[0.8fr,1.2fr] md:px-6">
            <div>
              <div className="text-sm font-semibold uppercase text-primary">{tHome('categoriesEyebrow')}</div>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950 md:text-3xl">{tHome('categoriesTitle')}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {categoryLinks.map((link) => (
                <Button key={link.href} asChild variant="outline" className="rounded-md">
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              ))}
              <Button asChild variant="ghost" className="rounded-md text-primary">
                <Link href={storefrontShopPath}>
                  <span>{tHome('featuredCta')}</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Featured items + guide cards ──────────────────────────── */}
        <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 md:px-6 lg:grid-cols-[1fr,360px]">
          <div className="space-y-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-sm font-semibold uppercase text-primary">{tHome('featuredEyebrow')}</div>
                <h2 className="mt-1 text-3xl font-semibold text-slate-950">{tHome('featuredTitle')}</h2>
              </div>
              <Button asChild variant="outline" className="hidden rounded-md px-5 sm:inline-flex">
                <Link href={storefrontShopPath}>{tHome('featuredCta')}</Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredItems.map((item) => (
                <Link
                  key={item.id}
                  href={`${storefrontShopPath}?q=${encodeURIComponent(item.product.name)}`}
                  className="group overflow-hidden rounded-md border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-white">
                    {item.product.imageUrl ? (
                      <Image
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        fill
                        sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-contain p-3 transition duration-500 group-hover:scale-[1.03]"
                        placeholder="blur"
                        blurDataURL={BLUR_SLATE}
                      />
                    ) : (
                      <div className="flex h-full items-end p-5">
                        <div className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                          Avant
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    {/* Category badges — Title Case */}
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-md bg-primary/10 px-2.5 py-1 text-primary">
                        {capitalizeCategory(item.category.name)}
                      </span>
                      {item.subcategory ? (
                        <span className="rounded-md bg-sky-50 px-2.5 py-1 text-sky-700">
                          {capitalizeCategory(item.subcategory.name)}
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <h3 className="line-clamp-2 text-lg font-semibold text-slate-950">{item.product.name}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {item.product.description || tHome('productFallback')}
                      </p>
                    </div>
                    {/* Arrow only — price removed */}
                    <div className="flex justify-end border-t border-border pt-3">
                      <ArrowRight className="size-5 text-primary transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-3 lg:pt-11">
            <div className="rounded-md border border-border bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold uppercase text-primary">{tHome('highlightTitle')}</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{tHome('highlightDescription')}</p>
            </div>
            {guideCards.map((card) => {
              const Icon = card.icon;

              return (
                <div key={card.title} className="rounded-md border border-border bg-white p-5 shadow-sm">
                  <div className="mb-3 inline-flex rounded-md bg-slate-100 p-2 text-slate-800">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-950">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
                </div>
              );
            })}
          </aside>
        </section>

        {/* ── Category preview grid ─────────────────────────────────── */}
        <section className="bg-white">
          <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
            <div className="mb-5">
              <div className="text-sm font-semibold uppercase text-primary">{tHome('categoriesEyebrow')}</div>
              <h2 className="mt-1 text-3xl font-semibold text-slate-950">{tHome('categoryPreviewTitle')}</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {categoryPreviews.map((category) => (
                <Link
                  key={category.id}
                  href={`${storefrontShopPath}?category=${encodeURIComponent(category.slug ?? category.id)}`}
                  className="group rounded-md border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Category name in Title Case */}
                    <h3 className="text-xl font-semibold text-slate-950">{capitalizeCategory(category.name)}</h3>
                    <ArrowRight className="mt-1 size-4 text-primary transition group-hover:translate-x-1" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    {/* Product count badge — price badge removed */}
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700">
                      {tHome('categoryProducts', { count: category.productCount })}
                    </span>
                  </div>
                  <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                    {category.sampleProducts.map((product) => (
                      <div key={product.id} className="truncate">
                        {product.name}
                      </div>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Value proposition cards ───────────────────────────────── */}
        <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-10 md:px-6 lg:grid-cols-3">
          {valueCards.map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.title} className="rounded-md border border-border bg-white p-5 shadow-sm">
                <div className="mb-4 inline-flex rounded-md bg-primary/10 p-3 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-xl font-semibold text-slate-950">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.description}</p>
              </div>
            );
          })}
        </section>

        {/* ── Closing CTA ───────────────────────────────────────────── */}
        <section className="border-y border-border bg-slate-950 text-white">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <h2 className="text-2xl font-semibold">{tHome('closingTitle')}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">{tHome('closingDescription')}</p>
            </div>
            <Button asChild size="lg" className="w-full rounded-md md:w-auto">
              <Link href={storefrontShopPath}>
                <span>{tHome('primaryCta')}</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <RetailSiteFooter categoryLinks={categoryLinks} />
    </div>
  );
}
