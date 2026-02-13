'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toastError, toastSuccess } from '@/lib/toast';
import { useLanguage } from '@/lib/useLanguage';
import { type CartItemInput, useCartStore } from '@/lib/cart/cartStore';
import {
  buildSearchEntries,
  indexCatalog,
  filterCatalog,
  type CatalogCategory,
  type CatalogResponse,
  type SearchEntry,
} from '@/lib/avantech/catalogApi';
import { formatPrice } from '@/lib/avantech/format';
import { formatDisplayTitle } from '@/lib/formatTitle';
import Header from './Header';
import CategorySection from './CategorySection';
import ProductCard from './ProductCard';
import FloatingCartBar from './FloatingCartBar';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import CartDrawer from './CartDrawer';
import PwaAutoReload from '@/components/PwaAutoReload';

const HIGHLIGHT_MS = 1200;

type CartLine = {
  variantId: string;
  productName: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
};

function AvantechContent() {
  const { lang } = useLanguage();
  const t = useTranslations('avantech');
  const tCatalog = useTranslations('avantech.catalog');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const items = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addToCart);
  const decrement = useCartStore((state) => state.decrement);
  const removeItem = useCartStore((state) => state.removeItem);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const clear = useCartStore((state) => state.clear);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [autoSelectVariantId, setAutoSelectVariantId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('all');
  const highlightTimerRef = useRef<number | null>(null);
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

  const visibleCategories = useMemo(
    () => filterCatalog(categories, selectedCategoryId, selectedSubcategoryId),
    [categories, selectedCategoryId, selectedSubcategoryId]
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

  const cartLines = useMemo<CartLine[]>(
    () =>
      Object.values(items)
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          variantId: item.variantId,
          productName: formatTitleCase(item.productName),
          variantLabel: item.variantLabel,
          unitPrice: item.price,
          quantity: item.quantity,
        })),
    [formatTitleCase, items]
  );

  const totalPriceNumber = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [cartLines]
  );

  const totalCount = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.quantity, 0),
    [cartLines]
  );

  const handleSearchSelect = (entry: SearchEntry) => {
    const product = productsById[entry.productId];
    setSelectedCategoryId('all');
    setSelectedSubcategoryId('all');
    if (product) {
      setSectionState(`category:${product.categoryId}`, true);
      if (product.subcategoryId) {
        setSectionState(`subcategory:${product.subcategoryId}`, true);
      } else {
        setSectionState(`subcategory:${product.categoryId}-uncategorized`, true);
      }
    }

    setAutoSelectVariantId(entry.variantId);
    setHighlightedProductId(entry.productId);

    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }

    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedProductId((current) => (current === entry.productId ? null : current));
    }, HIGHLIGHT_MS);

    let attempts = 0;
    const tryScroll = () => {
      const target = document.getElementById(`product-${entry.productId}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (attempts >= 6) return;
      attempts += 1;
      window.requestAnimationFrame(tryScroll);
    };
    tryScroll();
  };

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const handleOrder = async () => {
    if (cartLines.length === 0 || isOrdering) return;
    setIsOrdering(true);
    let didSucceed = false;

    try {
      const response = await fetch('/api/telegram-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: lang,
          items: cartLines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || t('cart.orderFailed'));
      }

      toastSuccess(t('cart.orderSuccess'));
      clear();
      didSucceed = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : t('cart.orderFailed');
      toastError(message);
    } finally {
      if (didSucceed) {
        setIsCartOpen(false);
      }
      setIsOrdering(false);
    }
  };

  const getQuantity = (variantId: string) => items[variantId]?.quantity ?? 0;

  const buildCartItemInput = (variantId: string): CartItemInput | null => {
    const variant = variantsById[variantId];
    if (!variant) return null;
    const product = productsById[variant.productId];
    if (!product) return null;
    return {
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      variantLabel: variant.label,
      price: variant.price,
      imageUrl: product.imageUrl ?? null,
    };
  };

  const handleAddToCart = (variantId: string) => {
    const input = buildCartItemInput(variantId);
    if (!input) return;
    addToCart(input);
  };

  const handleSetQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variantId);
      return;
    }
    if (items[variantId]) {
      setQuantity(variantId, quantity);
      return;
    }
    const input = buildCartItemInput(variantId);
    if (!input) return;
    addToCart({ ...input, quantity });
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId('all');
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    setSelectedSubcategoryId(subcategoryId);
  };

  return (
    <div className="relative min-h-screen bg-white text-foreground">
      <PwaAutoReload isBusy={isCartOpen || isOrdering} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80rem_48rem_at_-12%_-28%,rgba(255,72,0,0.14),transparent_60%),radial-gradient(64rem_40rem_at_108%_-12%,rgba(0,156,214,0.1),transparent_62%),linear-gradient(to_bottom,rgba(255,255,255,0.7),rgba(255,255,255,0.95))]" />
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative">
        <Header
          entries={searchEntries}
          onSelect={handleSearchSelect}
          formatPrice={formatPriceLocalized}
          categories={categoryOptions}
          subcategories={subcategoryOptions}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={handleCategoryChange}
          selectedSubcategoryId={selectedSubcategoryId}
          onSubcategoryChange={handleSubcategoryChange}
        />
        <main className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-6 md:px-6">
          {isLoadingCatalog ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
              {tCommon('states.loading')}
            </div>
          ) : catalogError ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
              <span>{tErrors('generic')}</span>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl px-4 text-xs"
                onClick={() => setReloadToken((prev) => prev + 1)}
              >
                {tCommon('actions.refresh')}
              </Button>
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
              {tCommon('states.empty')}
            </div>
          ) : (
            visibleCategories.map((category) => (
              <CategorySection
                key={category.id}
                id={`category-${category.id}`}
                title={category.name}
                count={category.products.length}
                headerClassName="shadow-sm rounded-xl border border border-muted/70 bg-white p-4"
                contentClassName="mt-0"
                defaultOpen={getSectionState(`category:${category.id}`, false)}
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
                        defaultOpen={getSectionState(`subcategory:${group.id}`, false)}
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
                                autoSelectVariantId={autoSelectVariantId}
                                getQuantity={getQuantity}
                                setQuantity={handleSetQuantity}
                                onIncrement={handleAddToCart}
                                onDecrement={decrement}
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

        <FloatingCartBar
          totalLabel={t('cart.total')}
          totalPrice={formatPriceLocalized(totalPriceNumber)}
          itemCount={totalCount}
          cartLabel={t('cart.title')}
          disabled={cartLines.length === 0}
          onOpenCart={() => setIsCartOpen(true)}
        />
      </div>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <CartDrawer
          lines={cartLines}
          totalPrice={formatPriceLocalized(totalPriceNumber)}
          formatPrice={formatPriceLocalized}
          onIncrement={handleAddToCart}
          onDecrement={decrement}
          onSetQuantity={handleSetQuantity}
          onRemove={removeItem}
          onOrder={handleOrder}
          isOrdering={isOrdering}
        />
      </Sheet>
    </div>
  );
}

export default function AvantechApp() {
  return <AvantechContent />;
}
