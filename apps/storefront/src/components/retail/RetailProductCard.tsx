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
import { capitalizeCategory } from '@/lib/categoryUtils';
import { BLUR_SLATE } from '@/lib/imagePlaceholder';
import { cn } from '@/lib/utils';

type Props = {
  item: RetailCatalogItem;
  getQuantity: (variantId: string) => number;
  onAddToCart: (item: CartItemInput) => void;
  onIncrement: (variantId: string) => void;
  onDecrement: (variantId: string) => void;
  onSetQuantity: (variantId: string, quantity: number) => void;
};

export default function RetailProductCard({
  item,
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
      <div className="relative aspect-[4/3] overflow-hidden bg-white">
        {item.product.imageUrl ? (
          <Image
            src={item.product.imageUrl}
            alt={item.product.name}
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
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

      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Category + subcategory badges — names formatted in Title Case */}
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

        <div className="space-y-2">
          <h3 className="line-clamp-2 text-lg font-semibold text-slate-950">{item.product.name}</h3>
          {item.product.description ? (
            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.product.description}</p>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">{tShop('cardFallbackDescription')}</p>
          )}
        </div>

        {/* Variant selector — label only, no price displayed */}
        <div className="flex flex-wrap gap-2">
          {item.variants.map((variant) => {
            const isSelected = variant.id === selectedVariant?.id;

            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setPreferredVariantId(variant.id)}
                className={cn(
                  'min-h-[44px] rounded-md border px-3 py-2 text-left transition',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-white text-foreground hover:border-primary/35 hover:bg-primary/5'
                )}
              >
                <div className="text-sm font-semibold">{variant.label}</div>
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
