'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLanguage } from '@/lib/useLanguage';
import {
  buildSearchEntries,
  filterCatalog,
  filterCatalogBySearch,
  indexCatalog,
  type CatalogCategory,
  type CatalogResponse,
  type SearchEntry,
} from '@plumbing/catalog/catalogApi';
import { formatPrice } from '@plumbing/catalog/format';
import { formatDisplayTitle } from '@/lib/formatTitle';
import Header from './Header';
import CategorySection from './CategorySection';
import ProductCard from './ProductCard';
import { Button } from '@/components/ui/button';
import PwaAutoReload from '@/components/PwaAutoReload';

const HIGHLIGHT_MS = 1200;
const CATALOG_VERSION_POLL_MS = 30 * 1000;

const hasActiveCatalogInput = () => {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return false;
  const tagName = active.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || active.isContentEditable;
};

function AvantechContent() {
  const { lang } = useLanguage();
  const tCatalog = useTranslations('avantech.catalog');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [autoSelectVariantId, setAutoSelectVariantId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('all');
  const highlightTimerRef = useRef<number | null>(null);
  const catalogVersionRef = useRef<string | null>(null);
  const didSyncSelection = useRef(false);
  const sectionStateRef = useRef<Record<string, boolean>>({});

  const currencyLabel = tCommon('labels.currency');
  const formatPriceLocalized = (amount: number) => formatPrice(amount, lang, currencyLabel);
  const formatTitleCase = useCallback((value: string) => formatDisplayTitle(value, lang), [lang]);
  const getSectionState = useCallback((key: string, fallback = false) => {
    const stored = sectionStateRef.current[key];
    return typeof stored === 'boolean' ? stored : fallback;
  }, []);
  const setSectionState = useCallback((key: string, open: boolean) => {
    sectionStateRef.current[key] = open;
  }, []);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const loadCatalog = async () => {
      setIsLoadingCatalog(true);
      setCatalogError(false);

      try {
        const response = await fetch(`/api/catalog?locale=${lang}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to load catalog (${response.status})`);
        }
        const payload = (await response.json()) as CatalogResponse;
        if (!isActive) return;
        setCategories(payload.categories ?? []);
        setCatalogVersion(payload.version ?? null);
      } catch (error) {
        if (!isActive) return;
        if (error instanceof Error && error.name === 'AbortError') return;
        setCatalogError(true);
      } finally {
        if (isActive) {
          setIsLoadingCatalog(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [lang, reloadToken]);

  useEffect(() => {
    catalogVersionRef.current = catalogVersion;
  }, [catalogVersion]);

  useEffect(() => {
    if (!catalogVersion) return;
    if (catalogError) return;

    let isActive = true;
    let isChecking = false;

    const checkCatalogVersion = async () => {
      if (!isActive) return;
      if (document.visibilityState !== 'visible') return;
      if (isChecking) return;
      isChecking = true;

      try {
        const response = await fetch(`/api/catalog/version?locale=${lang}`, { cache: 'no-store' });
        if (!response.ok) return;
        const payload = (await response.json()) as { version?: string };
        const nextVersion = payload.version ?? null;
        if (!nextVersion || nextVersion === catalogVersionRef.current) return;

        if (hasActiveCatalogInput()) return;
        setReloadToken((prev) => prev + 1);
      } finally {
        isChecking = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void checkCatalogVersion();
    }, CATALOG_VERSION_POLL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkCatalogVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [catalogError, catalogVersion, lang]);

  const { productsById, variantsById } = useMemo(() => indexCatalog(categories), [categories]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );
  const categoryBySlug = useMemo(
    () => new Map(categories.map((category) => [category.slug ?? category.id, category])),
    [categories]
  );
  const subcategoryById = useMemo(() => {
    const map = new Map<string, { id: string; slug?: string | null; categoryId: string }>();
    categories.forEach((category) => {
      category.subcategories.forEach((subcategory) => {
        map.set(subcategory.id, { ...subcategory, categoryId: category.id });
      });
    });
    return map;
  }, [categories]);
  const subcategoryBySlug = useMemo(() => {
    const map = new Map<string, { id: string; slug?: string | null; categoryId: string }>();
    categories.forEach((category) => {
      category.subcategories.forEach((subcategory) => {
        map.set(subcategory.slug ?? subcategory.id, { ...subcategory, categoryId: category.id });
      });
    });
    return map;
  }, [categories]);

  useEffect(() => {
    if (!categories.length) return;
    const params = new URLSearchParams(searchParamsString);
    const categoryParam = params.get('category');
    const subcategoryParam = params.get('subcategory');
    const matchedCategory = categoryParam
      ? categoryBySlug.get(categoryParam) ?? categoryById.get(categoryParam)
      : null;
    const matchedSubcategory = subcategoryParam
      ? subcategoryBySlug.get(subcategoryParam) ?? subcategoryById.get(subcategoryParam)
      : null;

    setSelectedCategoryId(matchedCategory ? matchedCategory.id : 'all');
    if (matchedSubcategory && (!matchedCategory || matchedSubcategory.categoryId === matchedCategory.id)) {
      setSelectedSubcategoryId(matchedSubcategory.id);
    } else {
      setSelectedSubcategoryId('all');
    }
    didSyncSelection.current = true;
  }, [categories, categoryById, categoryBySlug, searchParamsString, subcategoryById, subcategoryBySlug]);

  useEffect(() => {
    if (selectedCategoryId === 'all') {
      if (selectedSubcategoryId !== 'all') setSelectedSubcategoryId('all');
      return;
    }
    const category = categoryById.get(selectedCategoryId);
    if (!category) {
      setSelectedCategoryId('all');
      setSelectedSubcategoryId('all');
      return;
    }
    if (
      selectedSubcategoryId !== 'all' &&
      !category.subcategories.some((subcategory) => subcategory.id === selectedSubcategoryId)
    ) {
      setSelectedSubcategoryId('all');
    }
  }, [categoryById, selectedCategoryId, selectedSubcategoryId]);

  useEffect(() => {
    if (!didSyncSelection.current) return;
    const params = new URLSearchParams(searchParamsString);
    if (selectedCategoryId === 'all') {
      params.delete('category');
    } else {
      const slug = categoryById.get(selectedCategoryId)?.slug ?? selectedCategoryId;
      params.set('category', slug);
    }
    if (selectedSubcategoryId === 'all') {
      params.delete('subcategory');
    } else {
      const slug = subcategoryById.get(selectedSubcategoryId)?.slug ?? selectedSubcategoryId;
      params.set('subcategory', slug);
    }
    const nextQuery = params.toString();
    if (nextQuery === searchParamsString) return;
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [
    categoryById,
    pathname,
    router,
    searchParamsString,
    selectedCategoryId,
    selectedSubcategoryId,
    subcategoryById,
  ]);

  const searchQueryTrimmed = searchQuery.trim();
  const isSearching = searchQueryTrimmed.length > 0;

  const filteredCategories = useMemo(
    () =>
      isSearching
        ? categories
        : filterCatalog(categories, selectedCategoryId, selectedSubcategoryId),
    [categories, isSearching, selectedCategoryId, selectedSubcategoryId]
  );

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ id: category.id, name: category.name })),
    [categories]
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const subcategoryOptions = useMemo(
    () =>
      selectedCategory?.subcategories.map((subcategory) => ({
        id: subcategory.id,
        name: formatTitleCase(subcategory.name),
      })) ?? [],
    [formatTitleCase, selectedCategory]
  );

  const searchEntries = useMemo(() => {
    if (isLoadingCatalog || catalogError) return [];
    return buildSearchEntries(Object.values(variantsById), productsById);
  }, [catalogError, isLoadingCatalog, productsById, variantsById]);

  const searchFilteredCatalog = useMemo(
    () => filterCatalogBySearch(filteredCategories, searchEntries, searchQueryTrimmed),
    [filteredCategories, searchEntries, searchQueryTrimmed]
  );

  const visibleCategories = searchFilteredCatalog.categories;
  const matchedVariantByProductId = searchFilteredCatalog.matchedVariantByProductId;

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setSelectedCategoryId('all');
      setSelectedSubcategoryId('all');
    }
    if (!query.trim()) {
      setHighlightedProductId(null);
      setAutoSelectVariantId(null);
    }
  };

  const handleSearchSelect = (entry: SearchEntry) => {
    setSearchQuery(entry.title);
    setSelectedCategoryId('all');
    setSelectedSubcategoryId('all');
    setAutoSelectVariantId(entry.variantId);
    setHighlightedProductId(entry.productId);

    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }

    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedProductId((current) => (current === entry.productId ? null : current));
    }, HIGHLIGHT_MS);
  };

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId('all');
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    setSelectedSubcategoryId(subcategoryId);
  };

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-slate-50 text-foreground">
      <PwaAutoReload />
      <div className="relative">
        <Header
          entries={searchEntries}
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchQueryChange}
          onSelect={handleSearchSelect}
          formatPrice={formatPriceLocalized}
          categories={categoryOptions}
          subcategories={subcategoryOptions}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={handleCategoryChange}
          selectedSubcategoryId={selectedSubcategoryId}
          onSubcategoryChange={handleSubcategoryChange}
        />
        <main className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5 md:px-6 md:pt-6">
          {isLoadingCatalog ? (
            <div className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              {tCommon('states.loading')}
            </div>
          ) : catalogError ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              <span>{tErrors('generic')}</span>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-md px-4 text-xs"
                onClick={() => setReloadToken((prev) => prev + 1)}
              >
                {tCommon('actions.refresh')}
              </Button>
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              {tCommon('states.empty')}
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              {isSearching ? tCatalog('searchEmpty') : tCommon('states.empty')}
            </div>
          ) : (
            visibleCategories.map((category) => (
              <CategorySection
                key={category.id}
                id={`category-${category.id}`}
                title={category.name}
                count={category.products.length}
                headerClassName="rounded-xl border border-muted/70 bg-white p-4 shadow-sm"
                contentClassName="mt-0"
                defaultOpen={isSearching || getSectionState(`category:${category.id}`, false)}
                onOpenChange={(open) => setSectionState(`category:${category.id}`, open)}
              >
                <div className="flex flex-col gap-2">
                  {(() => {
                    const subcategoryMap = new Map(category.subcategories.map((subcategory) => [subcategory.id, subcategory]));
                    const orderedSubcategories = [...category.subcategories].sort(
                      (a, b) => a.sortOrder - b.sortOrder
                    );
                    const subcategoryGroups = orderedSubcategories
                      .map((subcategory) => ({
                        id: subcategory.id,
                        name: formatTitleCase(subcategory.name),
                        products: category.products.filter((product) => product.subcategoryId === subcategory.id),
                      }))
                      .filter((group) => selectedSubcategoryId === 'all' || group.id === selectedSubcategoryId);

                    const uncategorizedProducts = category.products.filter(
                      (product) => !product.subcategoryId || !subcategoryMap.has(product.subcategoryId)
                    );

                    if (uncategorizedProducts.length > 0) {
                      subcategoryGroups.push({
                        id: `${category.id}-uncategorized`,
                        name: formatTitleCase(tCatalog('uncategorized')),
                        products: uncategorizedProducts,
                      });
                    }

                    return subcategoryGroups.map((group) => (
                      <CategorySection
                        key={group.id}
                        title={group.name}
                        count={group.products.length}
                        className="scroll-mt-16 px-4"
                        headerClassName="mb-3"
                        titleClassName="text-base md:text-base"
                        countClassName="px-2 py-0.5 text-[11px]"
                        contentClassName="mt-0 mb-4"
                        defaultOpen={isSearching || getSectionState(`subcategory:${group.id}`, false)}
                        onOpenChange={(open) => setSectionState(`subcategory:${group.id}`, open)}
                      >
                        {group.products.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border bg-white/40 px-3 py-4 text-center text-xs text-muted-foreground">
                            {tCommon('states.empty')}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {group.products.map((product) => (
                              <ProductCard
                                key={product.id}
                                product={product}
                                variants={product.variants}
                                highlight={highlightedProductId === product.id}
                                autoSelectVariantId={
                                  highlightedProductId === product.id
                                    ? autoSelectVariantId
                                    : matchedVariantByProductId.get(product.id)
                                }
                                formatPrice={formatPriceLocalized}
                              />
                            ))}
                          </div>
                        )}
                      </CategorySection>
                    ));
                  })()}
                </div>
              </CategorySection>
            ))
          )}
        </main>
      </div>
    </div>
  );
}

export default function AvantechApp() {
  return <AvantechContent />;
}
