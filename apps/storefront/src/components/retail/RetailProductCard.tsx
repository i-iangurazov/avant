'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type CartItemInput } from '@/lib/cart/cartStore';
import { type RetailCatalogItem } from '@/lib/retail/catalog';
import { resolveVariantPrice } from '@plumbing/catalog/pricing';
import { Button } from '@/components/ui/button';
import QuantityStepper from '@/components/avantech/QuantityStepper';
import { cn } from '@/lib/utils';

type Props = {
  item: RetailCatalogItem;
  formatPrice: (amount: number) => string;
  getQuantity: (variantId: string) => number;
  onAddToCart: (item: CartItemInput) => void;
  onIncrement: (variantId: string) => void;
  onDecrement: (variantId: string) => void;
  onSetQuantity: (variantId: string, quantity: number) => void;
};

export default function RetailProductCard({
  item,
  formatPrice,
  getQuantity,
  onAddToCart,
  onIncrement,
  onDecrement,
  onSetQuantity,
}: Props) {
  const tShop = useTranslations('retail.shop');
  const tCart = useTranslations('retail.cart');

  const cartVariantId = useMemo(
    () => item.variants.find((variant) => getQuantity(variant.id) > 0)?.id ?? null,
    [getQuantity, item.variants]
  );
  const [preferredVariantId, setPreferredVariantId] = useState<string | null>(item.defaultVariantId);
  const selectedVariantId = cartVariantId ?? preferredVariantId ?? item.defaultVariantId;

  const selectedVariant =
    item.variants.find((variant) => variant.id === selectedVariantId) ?? item.variants[0] ?? null;
  const quantity = selectedVariant ? getQuantity(selectedVariant.id) : 0;
  const selectedPrice = selectedVariant ? resolveVariantPrice(selectedVariant, 'retail') : item.minPrice;
  const hasPriceRange = item.minPrice !== item.maxPrice;
  const priceLabel = hasPriceRange
    ? `${tShop('fromLabel')} ${formatPrice(item.minPrice)}`
    : formatPrice(selectedPrice);

  const handleAdd = () => {
    if (!selectedVariant) return;
    onAddToCart({
      variantId: selectedVariant.id,
      productId: item.product.id,
      productName: item.product.name,
      variantLabel: selectedVariant.label,
      price: resolveVariantPrice(selectedVariant, 'retail'),
      imageUrl: item.product.imageUrl ?? null,
    });
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {item.product.imageUrl ? (
          <Image
            src={item.product.imageUrl}
            alt={item.product.name}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-end p-5">
            <div className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
              Avant
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-md bg-primary/10 px-2.5 py-1 text-primary">
            {item.category.name}
          </span>
          {item.subcategory ? (
            <span className="rounded-md bg-sky-50 px-2.5 py-1 text-sky-700">
              {item.subcategory.name}
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <h3 className="line-clamp-2 text-lg font-semibold text-slate-950">{item.product.name}</h3>
          {item.product.description ? (
            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.product.description}</p>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">{tShop('cardFallbackDescription')}</p>
          )}
        </div>

        <div className="border-t border-border pt-3">
          <div className="text-xs uppercase text-muted-foreground">{tShop('priceLabel')}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{priceLabel}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {tShop('variantCount', { count: item.variants.length })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.variants.map((variant) => {
            const price = resolveVariantPrice(variant, 'retail');
            const isSelected = variant.id === selectedVariant?.id;

            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setPreferredVariantId(variant.id)}
                className={cn(
                  'min-h-[48px] rounded-md border px-3 py-2 text-left transition',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-white text-foreground hover:border-primary/35 hover:bg-primary/5'
                )}
              >
                <div className="text-sm font-semibold">{variant.label}</div>
                <div className={cn('text-xs', isSelected ? 'text-white/80' : 'text-muted-foreground')}>
                  {formatPrice(price)}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          {quantity > 0 && selectedVariant ? (
            <QuantityStepper
              value={quantity}
              onIncrement={() => onIncrement(selectedVariant.id)}
              onDecrement={() => onDecrement(selectedVariant.id)}
              onChange={(next) => onSetQuantity(selectedVariant.id, next)}
              increaseLabel={tCart('increaseQty')}
              decreaseLabel={tCart('decreaseQty')}
              className="justify-start"
            />
          ) : (
            <Button type="button" size="lg" className="w-full rounded-md" onClick={handleAdd}>
              <ShoppingBag className="size-4" />
              <span>{tShop('addToCart')}</span>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
