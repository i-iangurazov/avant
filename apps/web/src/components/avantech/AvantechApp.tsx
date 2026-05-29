'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/lib/useLanguage';
import {
  buildSearchEntries,
  filterCatalogBySearch,
  indexCatalog,
  type CatalogCategory,
  type CatalogProduct,
  type CatalogResponse,
  type SearchEntry,
} from '@plumbing/catalog/catalogApi';
import { formatPrice } from '@plumbing/catalog/format';
import Header from './Header';
import ProductCard from './ProductCard';
import { Button } from '@/components/ui/button';
import PwaAutoReload from '@/components/PwaAutoReload';
import { type EntryMeta } from './SearchWithSuggestions';

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
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState('');
  const [autoSelectVariantId, setAutoSelectVariantId] = useState<string | null>(null);
  /** ID of the product currently shown in the single-product detail view. */
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const catalogVersionRef = useRef<string | null>(null);

  const currencyLabel = tCommon('labels.currency');
  const formatPriceLocalized = (amount: number) => formatPrice(amount, lang, currencyLabel);

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

  /** Per-product metadata used by the search dropdown thumbnail. */
  const productMetaById = useMemo(() => {
    const map = new Map<string, EntryMeta>();
    categories.forEach((category) => {
      category.products.forEach((product) => {
        map.set(product.id, { imageUrl: product.imageUrl ?? null });
      });
    });
    return map;
  }, [categories]);

  /** Returns thumbnail for a given search entry. */
  const getEntryMeta = useCallback(
    (entry: SearchEntry): EntryMeta =>
      productMetaById.get(entry.productId) ?? { imageUrl: null },
    [productMetaById]
  );

  useEffect(() => {
    if (!categories.length) return;
    const params = new URLSearchParams(searchParamsString);
    const productParam = params.get('product');

    // Restore selected product from URL (deep-link support).
    if (productParam) {
      const product =
        Object.values(productsById).find(
          (p) => p.slug === productParam || p.id === productParam
        ) ?? null;
      if (product) {
        setSelectedProductId(product.id);
        setSearchQuery(product.name);
      }
    }
  }, [categories.length, productsById, searchParamsString]);

  const submittedSearchQueryTrimmed = submittedSearchQuery.trim();
  const isSearching = submittedSearchQueryTrimmed.length > 0;

  const searchEntries = useMemo(() => {
    if (isLoadingCatalog || catalogError) return [];
    return buildSearchEntries(Object.values(variantsById), productsById);
  }, [catalogError, isLoadingCatalog, productsById, variantsById]);

  const searchFilteredCatalog = useMemo(
    () => filterCatalogBySearch(categories, searchEntries, submittedSearchQueryTrimmed),
    [categories, searchEntries, submittedSearchQueryTrimmed]
  );

  const visibleCategories = searchFilteredCatalog.categories;
  const matchedVariantByProductId = searchFilteredCatalog.matchedVariantByProductId;

  /** Flat list of all matching products — shown when searching but no product is selected. */
  const flatSearchResults = useMemo<CatalogProduct[]>(() => {
    if (!isSearching || selectedProductId) return [];
    return visibleCategories.flatMap((category) => category.products);
  }, [isSearching, selectedProductId, visibleCategories]);

  /** The product currently shown in the single-product detail view. */
  const selectedProduct = useMemo<CatalogProduct | null>(
    () => (selectedProductId ? (productsById[selectedProductId] ?? null) : null),
    [selectedProductId, productsById]
  );

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    setSubmittedSearchQuery('');
    // Typing always exits the single-product view.
    if (selectedProductId) {
      setSelectedProductId(null);
      // Remove the product param from the URL without a full navigation.
      const params = new URLSearchParams(searchParamsString);
      params.delete('product');
      router.replace(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });
    }
    if (!query.trim()) {
      setAutoSelectVariantId(null);
    }
  };

  const handleSearchSubmit = (query: string) => {
    const trimmed = query.trim();
    setSubmittedSearchQuery(trimmed);
    setSelectedProductId(null);
    setAutoSelectVariantId(null);

    const params = new URLSearchParams(searchParamsString);
    params.delete('product');
    params.delete('category');
    params.delete('subcategory');
    router.replace(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });
  };

  const handleSearchSelect = (entry: SearchEntry) => {
    // Keep the selected product name in the input so users can see what they chose.
    setSearchQuery(entry.title);
    setSubmittedSearchQuery('');
    setSelectedProductId(entry.productId);
    setAutoSelectVariantId(entry.variantId);

    // Push ?product=<slug|id> into the URL so the view is bookmarkable.
    const product = productsById[entry.productId];
    const productSlug = product?.slug ?? entry.productId;
    const params = new URLSearchParams(searchParamsString);
    params.set('product', productSlug);
    params.delete('category');
    params.delete('subcategory');
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  const handleBackToAll = () => {
    setSelectedProductId(null);
    setSearchQuery('');
    setSubmittedSearchQuery('');
    setAutoSelectVariantId(null);

    // Remove the product param and restore a clean URL.
    const params = new URLSearchParams(searchParamsString);
    params.delete('product');
    router.replace(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });
  };


  // ------------------------------------------------------------------
  // Determine view mode
  // ------------------------------------------------------------------

  /** 'product' → single selected product detail view
   *  'search'  → flat grid of search results
   *  'empty'   → no products until the user searches */
  const viewMode =
    selectedProduct !== null ? 'product' : isSearching ? 'search' : 'empty';

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const renderMainContent = () => {
    if (isLoadingCatalog) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
          {tCatalog('searchPrompt')}
        </div>
      );
    }

    if (catalogError) {
      return (
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
      );
    }

    if (categories.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
          {tCommon('states.empty')}
        </div>
      );
    }

    // ── Single product detail view ──────────────────────────────────
    if (viewMode === 'product' && selectedProduct) {
      return (
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBackToAll}
            className="gap-1.5 rounded-md"
          >
            <ArrowLeft className="size-4" />
            {tCatalog('backToAll')}
          </Button>
          <div className="mx-auto max-w-md">
            <ProductCard
              product={selectedProduct}
              variants={selectedProduct.variants}
              highlight={false}
              autoSelectVariantId={autoSelectVariantId}
              formatPrice={formatPriceLocalized}
            />
          </div>
        </div>
      );
    }

    // ── Flat search results (searching, no product selected) ────────
    if (viewMode === 'search') {
      if (flatSearchResults.length === 0) {
        return (
          <div className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
            {tCatalog('searchEmpty')}
          </div>
        );
      }
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {flatSearchResults.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variants={product.variants}
              highlight={false}
              autoSelectVariantId={matchedVariantByProductId.get(product.id) ?? null}
              formatPrice={formatPriceLocalized}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
        {tCatalog('searchPrompt')}
      </div>
    );
  };

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-slate-50 text-foreground">
      <PwaAutoReload />
      <div className="relative">
        <Header
          entries={searchEntries}
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchQueryChange}
          onSearchSubmit={handleSearchSubmit}
          onSelect={handleSearchSelect}
          formatPrice={formatPriceLocalized}
          getEntryMeta={getEntryMeta}
        />
        <main className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5 md:px-6 md:pt-6">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
}

export default function AvantechApp() {
  return <AvantechContent />;
}
