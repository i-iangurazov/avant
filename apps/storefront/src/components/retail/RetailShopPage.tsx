'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type CatalogCategory, type CatalogVariant } from '@plumbing/catalog/catalogApi';
import { formatPrice } from '@plumbing/catalog/format';
import { matchesSearchText } from '@plumbing/catalog/search';
import { type CartItemInput, useCartStore } from '@/lib/cart/cartStore';
import { resolveVariantPrice } from '@plumbing/catalog/pricing';
import { flattenRetailCatalog, sortRetailItems, type RetailSortOption } from '@/lib/retail/catalog';
import { useLanguage } from '@/lib/useLanguage';
import { toastError, toastSuccess } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import RetailCartDrawer from './RetailCartDrawer';
import RetailProductCard from './RetailProductCard';
import RetailSiteFooter from './RetailSiteFooter';
import RetailSiteHeader from './RetailSiteHeader';

type Props = {
  categories: CatalogCategory[];
  basePath?: string;
};

type CartLine = {
  variantId: string;
  productName: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string | null;
};

type CheckoutDetails = {
  name: string;
  phone: string;
  address: string;
};

type CheckoutErrors = Partial<Record<keyof CheckoutDetails, string>>;

const SORT_OPTIONS: RetailSortOption[] = ['popular', 'price-asc', 'price-desc', 'name'];

const getSafeSort = (value: string | null): RetailSortOption =>
  value && SORT_OPTIONS.includes(value as RetailSortOption) ? (value as RetailSortOption) : 'popular';

export default function RetailShopPage({ categories, basePath = '' }: Props) {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const tShop = useTranslations('retail.shop');
  const tHeader = useTranslations('retail.header');
  const tCart = useTranslations('retail.cart');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const items = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addToCart);
  const decrement = useCartStore((state) => state.decrement);
  const removeItem = useCartStore((state) => state.removeItem);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const clear = useCartStore((state) => state.clear);
  const [query, setQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('all');
  const [sort, setSort] = useState<RetailSortOption>('popular');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutDetails>({ name: '', phone: '', address: '' });
  const [checkoutErrors, setCheckoutErrors] = useState<CheckoutErrors>({});
  const normalizedBasePath = basePath.replace(/\/$/, '');
  const shopPath = normalizedBasePath ? `${normalizedBasePath}/shop` : '/shop';

  const currencyLabel = tCommon('labels.currency');
  const formatPriceLocalized = (amount: number) => formatPrice(amount, lang, currencyLabel);

  const retailItems = useMemo(() => flattenRetailCatalog(categories), [categories]);

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
    const q = searchParams.get('q') ?? '';
    const sortParam = getSafeSort(searchParams.get('sort'));
    const categoryParam = searchParams.get('category');
    const subcategoryParam = searchParams.get('subcategory');
    const matchedCategory = categoryParam
      ? categoryBySlug.get(categoryParam) ?? categoryById.get(categoryParam)
      : null;
    const matchedSubcategory = subcategoryParam
      ? subcategoryBySlug.get(subcategoryParam) ?? subcategoryById.get(subcategoryParam)
      : null;

    setQuery(q);
    setSort(sortParam);
    setSelectedCategoryId(matchedCategory ? matchedCategory.id : 'all');
    if (matchedSubcategory && (!matchedCategory || matchedSubcategory.categoryId === matchedCategory.id)) {
      setSelectedSubcategoryId(matchedSubcategory.id);
    } else {
      setSelectedSubcategoryId('all');
    }
  }, [categoryById, categoryBySlug, searchParams, subcategoryById, subcategoryBySlug]);

  useEffect(() => {
    if (selectedCategoryId === 'all') {
      if (selectedSubcategoryId !== 'all') {
        setSelectedSubcategoryId('all');
      }
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

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const availableSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const itemIds = new Set(
      retailItems
        .filter((item) => item.category.id === selectedCategory.id)
        .map((item) => item.subcategory?.id)
        .filter((value): value is string => Boolean(value))
    );

    return selectedCategory.subcategories.filter((subcategory) => itemIds.has(subcategory.id));
  }, [retailItems, selectedCategory]);

  const itemsByVariantId = useMemo(() => {
    const map = new Map<string, { variant: CatalogVariant; item: (typeof retailItems)[number] }>();
    retailItems.forEach((item) => {
      item.variants.forEach((variant) => {
        map.set(variant.id, { item, variant });
      });
    });
    return map;
  }, [retailItems]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim();

    const filtered = retailItems.filter((item) => {
      if (selectedCategoryId !== 'all' && item.category.id !== selectedCategoryId) return false;
      if (selectedSubcategoryId !== 'all' && item.subcategory?.id !== selectedSubcategoryId) return false;
      if (normalizedQuery && !matchesSearchText(item.searchText, normalizedQuery)) return false;
      return true;
    });

    return sortRetailItems(filtered, sort);
  }, [query, retailItems, selectedCategoryId, selectedSubcategoryId, sort]);

  const cartLines = useMemo<CartLine[]>(
    () =>
      Object.values(items)
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          variantId: item.variantId,
          productName: item.productName,
          variantLabel: item.variantLabel,
          unitPrice: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl ?? null,
        })),
    [items]
  );

  const totalCount = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.quantity, 0),
    [cartLines]
  );
  const totalPrice = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [cartLines]
  );

  const getQuantity = (variantId: string) => items[variantId]?.quantity ?? 0;

  const buildCartItemInput = (variantId: string): CartItemInput | null => {
    const entry = itemsByVariantId.get(variantId);
    if (!entry) return null;

    return {
      variantId: entry.variant.id,
      productId: entry.item.product.id,
      productName: entry.item.product.name,
      variantLabel: entry.variant.label,
      price: resolveVariantPrice(entry.variant, 'retail'),
      imageUrl: entry.item.product.imageUrl ?? null,
    };
  };

  const handleAddToCart = (item: CartItemInput) => {
    addToCart(item);
    setIsCartOpen(true);
  };

  const handleIncrement = (variantId: string) => {
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

  const handleCheckoutChange = (field: keyof CheckoutDetails, value: string) => {
    setCheckout((current) => ({ ...current, [field]: value }));
    setCheckoutErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validateCheckout = () => {
    const fieldRequired = tCart('fieldRequired');
    const nextErrors: CheckoutErrors = {};

    if (!checkout.name.trim()) nextErrors.name = fieldRequired;
    if (!checkout.phone.trim()) nextErrors.phone = fieldRequired;
    if (!checkout.address.trim()) nextErrors.address = fieldRequired;

    setCheckoutErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleOrder = async () => {
    if (cartLines.length === 0 || isOrdering) return;
    if (!validateCheckout()) {
      toastError(tCart('checkoutRequired'));
      return;
    }

    setIsOrdering(true);
    let didSucceed = false;
    const customer = {
      name: checkout.name.trim(),
      phone: checkout.phone.trim(),
      address: checkout.address.trim(),
    };

    try {
      const response = await fetch('/api/telegram-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: lang,
          priceMode: 'retail',
          customer,
          items: cartLines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || tCart('submitError'));
      }

      toastSuccess(tCart('submitSuccess'));
      clear();
      setCheckout({ name: '', phone: '', address: '' });
      setCheckoutErrors({});
      didSucceed = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : tErrors('generic');
      toastError(message);
    } finally {
      if (didSucceed) {
        setIsCartOpen(false);
      }
      setIsOrdering(false);
    }
  };

  const categoryLinks = useMemo(
    () =>
      categories
        .filter((category) => category.products.length > 0)
        .slice(0, 4)
        .map((category) => ({
          href: `${shopPath}?category=${encodeURIComponent(category.slug ?? category.id)}`,
          label: category.name,
        })),
    [categories, shopPath]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-foreground">
      <RetailSiteHeader
        cartCount={totalCount}
        onOpenCart={() => setIsCartOpen(true)}
        basePath={normalizedBasePath}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-7 md:px-6 md:py-9">
        <section className="border-b border-border pb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase text-primary">{tShop('eyebrow')}</div>
              <h1 className="mt-1 text-3xl font-semibold text-slate-950 md:text-4xl">{tHeader('shop')}</h1>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-border bg-white px-4 py-3 shadow-sm">
                <div className="text-xs uppercase text-muted-foreground">{tShop('stats.products')}</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{retailItems.length}</div>
              </div>
              <div className="rounded-md border border-border bg-white px-4 py-3 shadow-sm">
                <div className="text-xs uppercase text-muted-foreground">{tShop('stats.categories')}</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{categories.length}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr,280px]">
            <div className="relative">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tShop('searchPlaceholder')}
                aria-label={tShop('searchPlaceholder')}
                className="h-12 rounded-md border-border pl-11"
              />
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <Select value={sort} onValueChange={(value) => setSort(value as RetailSortOption)}>
              <SelectTrigger aria-label={tShop('sortLabel')} contentId="retail-shop-sort">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-muted-foreground" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent contentId="retail-shop-sort">
                <SelectItem value="popular">{tShop('sortPopular')}</SelectItem>
                <SelectItem value="price-asc">{tShop('sortPriceAsc')}</SelectItem>
                <SelectItem value="price-desc">{tShop('sortPriceDesc')}</SelectItem>
                <SelectItem value="name">{tShop('sortName')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId('all');
                setSelectedSubcategoryId('all');
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedCategoryId === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-slate-100 text-slate-700 hover:bg-primary/5 hover:text-foreground'
              }`}
            >
              {tShop('allCategories')}
            </button>
            {categories
              .filter((category) => category.products.length > 0)
              .map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setSelectedSubcategoryId('all');
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    selectedCategoryId === category.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-slate-100 text-slate-700 hover:bg-primary/5 hover:text-foreground'
                  }`}
                >
                  {category.name}
                </button>
              ))}
          </div>

          {selectedCategoryId !== 'all' && availableSubcategories.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedSubcategoryId('all')}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  selectedSubcategoryId === 'all'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground'
                }`}
              >
                {tShop('allSubcategories')}
              </button>
              {availableSubcategories.map((subcategory) => (
                <button
                  key={subcategory.id}
                  type="button"
                  onClick={() => setSelectedSubcategoryId(subcategory.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    selectedSubcategoryId === subcategory.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  {subcategory.name}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950">{tShop('results', { count: filteredItems.length })}</div>
            <div className="text-sm text-muted-foreground">{tShop('resultsHint')}</div>
          </div>
        </section>

        {filteredItems.length > 0 ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <RetailProductCard
                key={item.id}
                item={item}
                formatPrice={formatPriceLocalized}
                getQuantity={getQuantity}
                onAddToCart={handleAddToCart}
                onIncrement={handleIncrement}
                onDecrement={decrement}
                onSetQuantity={handleSetQuantity}
              />
            ))}
          </section>
        ) : (
          <section className="rounded-[28px] border border-dashed border-border bg-white/80 px-6 py-14 text-center shadow-sm">
            <div className="mx-auto max-w-xl space-y-3">
              <h2 className="text-2xl font-semibold text-slate-950">{tShop('emptyTitle')}</h2>
              <p className="text-muted-foreground">{tShop('emptyDescription')}</p>
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5"
                onClick={() => {
                  setQuery('');
                  setSelectedCategoryId('all');
                  setSelectedSubcategoryId('all');
                  setSort('popular');
                }}
              >
                {tShop('resetFilters')}
              </Button>
            </div>
          </section>
        )}
      </main>

      <RetailSiteFooter categoryLinks={categoryLinks} basePath={normalizedBasePath} />

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <RetailCartDrawer
          lines={cartLines}
          checkout={checkout}
          checkoutErrors={checkoutErrors}
          totalPrice={formatPriceLocalized(totalPrice)}
          formatPrice={formatPriceLocalized}
          onCheckoutChange={handleCheckoutChange}
          onIncrement={handleIncrement}
          onDecrement={decrement}
          onSetQuantity={handleSetQuantity}
          onRemove={removeItem}
          onClear={clear}
          onOrder={handleOrder}
          isOrdering={isOrdering}
        />
      </Sheet>
    </div>
  );
}
