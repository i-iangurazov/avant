'use client';

import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import QuantityStepper from './QuantityStepper';

type CartLine = {
  variantId: string;
  productName: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
};

type Props = {
  lines: CartLine[];
  totalPrice: string;
  formatPrice: (amount: number) => string;
  onIncrement: (variantId: string) => void;
  onDecrement: (variantId: string) => void;
  onSetQuantity: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
  onOrder: () => void;
  isOrdering: boolean;
};

export default function CartDrawer({
  lines,
  totalPrice,
  formatPrice,
  onIncrement,
  onDecrement,
  onSetQuantity,
  onRemove,
  onOrder,
  isOrdering,
}: Props) {
  const t = useTranslations('avantech');

  return (
    <SheetContent
      side="bottom"
      className="max-h-[90vh] w-screen max-w-none rounded-t-3xl border-t border-border px-0 pb-0"
    >
      <SheetHeader className="px-6 pb-2 pt-6">
        <SheetTitle className="text-lg">{t('cart.title')}</SheetTitle>
        <SheetDescription>{t('cart.subtitle')}</SheetDescription>
      </SheetHeader>
      <ScrollArea className="flex-1 min-h-0 px-6">
        {lines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
            {t('cart.empty')}
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-6">
            {lines.map((line) => {
              const lineTotal = line.unitPrice * line.quantity;
              return (
                <div key={line.variantId} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{line.productName}</div>
                      <div className="text-xs text-muted-foreground">{line.variantLabel}</div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1 text-base font-semibold text-foreground">
                        {line.quantity} x {formatPrice(line.unitPrice)} = {formatPrice(lineTotal)}
                      </div>
                      <div className="flex items-center gap-2">
                        <QuantityStepper
                          value={line.quantity}
                          onIncrement={() => onIncrement(line.variantId)}
                          onDecrement={() => onDecrement(line.variantId)}
                          onChange={(next) => onSetQuantity(line.variantId, next)}
                          increaseLabel={t('actions.increaseQty')}
                          decreaseLabel={t('actions.decreaseQty')}
                          className="min-w-[120px]"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemove(line.variantId)}
                          aria-label={t('actions.removeItem')}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      <SheetFooter className="border-t border-border bg-white px-6 py-4">
        <div className="flex w-full items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {t('cart.total')}
            </div>
            <div className="text-lg font-semibold text-foreground">{totalPrice}</div>
          </div>
          <Button
            type="button"
            size="lg"
            onClick={onOrder}
            disabled={lines.length === 0 || isOrdering}
            className={cn('rounded-xl px-6 text-sm font-semibold', lines.length === 0 && 'cursor-not-allowed')}
          >
            {isOrdering ? t('cart.sending') : t('cart.order')}
          </Button>
        </div>
      </SheetFooter>
    </SheetContent>
  );
}
