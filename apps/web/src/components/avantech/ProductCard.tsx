'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CatalogProduct, CatalogVariant } from '@plumbing/catalog/catalogApi';
import { formatDisplayTitle } from '@/lib/formatTitle';
import { useLanguage } from '@/lib/useLanguage';
import { cn } from '@/lib/utils';
import { BLUR_SLATE } from '@/lib/imagePlaceholder';
import VariantChips from './VariantChips';

type Props = {
  product: CatalogProduct;
  variants: CatalogVariant[];
  highlight?: boolean;
  autoSelectVariantId?: string | null;
  formatPrice: (price: number) => string;
};

export default function ProductCard({
  product,
  variants,
  highlight,
  autoSelectVariantId,
  formatPrice,
}: Props) {
  const { lang } = useLanguage();
  const tCatalog = useTranslations('avantech.catalog');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const productName = useMemo(() => formatDisplayTitle(product.name, lang), [product.name, lang]);
  const imageUrl = product.imageUrl ?? null;
  const imageSrc = imageUrl && failedImageUrl !== imageUrl ? imageUrl : null;

  const activeVariants = useMemo(() => variants.filter((variant) => variant.isActive), [variants]);
  const minPrice = useMemo(() => {
    if (activeVariants.length === 0) return null;
    return Math.min(...activeVariants.map((variant) => variant.price));
  }, [activeVariants]);

  useEffect(() => {
    if (!autoSelectVariantId) return;
    if (activeVariants.some((variant) => variant.id === autoSelectVariantId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedVariantId(autoSelectVariantId);
    }
  }, [activeVariants, autoSelectVariantId]);

  const handleSelectVariant = (variantId: string) => {
    if (variantId === selectedVariantId) {
      setSelectedVariantId(null);
      return;
    }
    setSelectedVariantId(variantId);
  };

  return (
    <article
      id={`product-${product.id}`}
      className={cn(
        'flex h-full flex-col gap-4 rounded-xl border border-border bg-white p-3 shadow-sm transition',
        highlight && 'ring-2 ring-primary/40 motion-safe:animate-[avantech-highlight_1.1s_ease-in-out]'
      )}
    >
      <div className="flex gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-primary/5">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={productName}
              fill
              sizes="96px"
              className="object-cover"
              placeholder="blur"
              blurDataURL={BLUR_SLATE}
              onError={() => setFailedImageUrl(imageSrc)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-[10px] font-medium uppercase text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-base font-semibold text-foreground">{productName}</h3>
          {product.description && (
            <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{product.description}</p>
          )}
          {minPrice !== null ? (
            <div className="mt-auto pt-3">
              <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                {tCatalog('priceFrom')}
              </div>
              <div className="mt-0.5 text-2xl font-bold text-primary">{formatPrice(minPrice)}</div>
            </div>
          ) : null}
        </div>
      </div>

      <VariantChips
        variants={activeVariants}
        selectedVariantId={selectedVariantId}
        onSelect={handleSelectVariant}
        formatPrice={formatPrice}
      />
    </article>
  );
}
