'use client';

import { useTranslations } from 'next-intl';
import type { CatalogVariant } from '@plumbing/catalog/catalogApi';
import { cn } from '@/lib/utils';

type Props = {
  variants: CatalogVariant[];
  selectedVariantId?: string | null;
  onSelect: (variantId: string) => void;
  formatPrice: (price: number) => string;
};

export default function VariantChips({ variants, selectedVariantId, onSelect, formatPrice }: Props) {
  const t = useTranslations('avantech');

  return (
    <div className="grid gap-2">
      {variants.map((variant) => {
        const label = variant.label;
        const isSelected = variant.id === selectedVariantId;
        return (
          <button
            key={variant.id}
            type="button"
            aria-pressed={isSelected}
            aria-label={t('actions.selectVariant', { variant: label })}
            onClick={() => onSelect(variant.id)}
            className={cn(
              'grid w-full grid-cols-1 gap-3 rounded-xl border px-3.5 py-3 text-left transition sm:grid-cols-[minmax(0,1fr),auto]',
              isSelected
                ? 'border-primary/50 bg-primary/5 text-foreground shadow-sm'
                : 'border-border bg-white text-foreground hover:border-primary/40 hover:bg-primary/5'
            )}
          >
            <span className="min-w-0 whitespace-normal break-words text-sm font-medium leading-6 text-foreground">
              {label}
            </span>
            <span
              className={cn(
                'justify-self-end whitespace-nowrap rounded-md px-1 text-right text-base font-bold leading-tight text-primary sm:self-end',
                isSelected ? 'bg-primary/10' : 'bg-transparent'
              )}
            >
              {formatPrice(variant.price)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
