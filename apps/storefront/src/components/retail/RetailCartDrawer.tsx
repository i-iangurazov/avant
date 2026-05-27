'use client';

import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { BLUR_SLATE } from '@/lib/imagePlaceholder';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import QuantityStepper from '@/components/avantech/QuantityStepper';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { cn } from '@/lib/utils';

type CartLine = {
  variantId: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  imageUrl?: string | null;
};

type CheckoutDetails = {
  name: string;
  phone: string;
  address: string;
};

type CheckoutErrors = Partial<Record<keyof CheckoutDetails, string>>;

type Props = {
  lines: CartLine[];
  checkout: CheckoutDetails;
  checkoutErrors: CheckoutErrors;
  onCheckoutChange: (field: keyof CheckoutDetails, value: string) => void;
  onIncrement: (variantId: string) => void;
  onDecrement: (variantId: string) => void;
  onSetQuantity: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
  onClear: () => void;
  onOrder: () => void;
  isOrdering: boolean;
};

export default function RetailCartDrawer({
  lines,
  checkout,
  checkoutErrors,
  onCheckoutChange,
  onIncrement,
  onDecrement,
  onSetQuantity,
  onRemove,
  onClear,
  onOrder,
  isOrdering,
}: Props) {
  const tCart = useTranslations('retail.cart');
  const isDesktop = useMediaQuery('(min-width: 768px)');

  return (
    <SheetContent
      side={isDesktop ? 'right' : 'bottom'}
      className={cn(
        isDesktop
          ? 'h-full w-full max-w-md border-l px-0 pb-0'
          : 'max-h-[90vh] w-screen max-w-none rounded-t-3xl border-t px-0 pb-0'
      )}
    >
      <SheetHeader className="px-6 pb-2 pt-6">
        <SheetTitle className="text-lg">{tCart('title')}</SheetTitle>
        <SheetDescription>{tCart('subtitle')}</SheetDescription>
      </SheetHeader>

      <ScrollArea className="min-h-0 flex-1 px-6">
        {lines.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
            {tCart('empty')}
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-6">
            <div className="rounded-md border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-slate-700">
              {tCart('managerNotice')}
            </div>

            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-foreground">{tCart('checkoutTitle')}</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">{tCart('checkoutDescription')}</div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  {tCart('customerName')}
                  <Input
                    value={checkout.name}
                    onChange={(event) => onCheckoutChange('name', event.target.value)}
                    placeholder={tCart('customerNamePlaceholder')}
                    aria-invalid={Boolean(checkoutErrors.name)}
                    autoComplete="name"
                  />
                  {checkoutErrors.name ? (
                    <span className="text-xs text-destructive">{checkoutErrors.name}</span>
                  ) : null}
                </label>

                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  {tCart('customerPhone')}
                  <Input
                    value={checkout.phone}
                    onChange={(event) => onCheckoutChange('phone', event.target.value)}
                    placeholder={tCart('customerPhonePlaceholder')}
                    aria-invalid={Boolean(checkoutErrors.phone)}
                    autoComplete="tel"
                  />
                  {checkoutErrors.phone ? (
                    <span className="text-xs text-destructive">{checkoutErrors.phone}</span>
                  ) : null}
                </label>

                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  {tCart('customerAddress')}
                  <Input
                    value={checkout.address}
                    onChange={(event) => onCheckoutChange('address', event.target.value)}
                    placeholder={tCart('customerAddressPlaceholder')}
                    aria-invalid={Boolean(checkoutErrors.address)}
                    autoComplete="street-address"
                  />
                  {checkoutErrors.address ? (
                    <span className="text-xs text-destructive">{checkoutErrors.address}</span>
                  ) : null}
                </label>
              </div>
            </div>

            {lines.map((line) => (
              <div key={line.variantId} className="rounded-3xl border border-border bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-muted/60">
                    {line.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt={line.productName}
                        fill
                        sizes="80px"
                        className="object-cover"
                        placeholder="blur"
                        blurDataURL={BLUR_SLATE}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Avant
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">{line.productName}</div>
                    <div className="text-xs text-muted-foreground">{line.variantLabel}</div>
                    {/* Quantity shown as plain text — no price displayed */}
                    <div className="mt-2 text-sm text-muted-foreground">
                      {tCart('qty')}: {line.quantity}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <QuantityStepper
                    value={line.quantity}
                    onIncrement={() => onIncrement(line.variantId)}
                    onDecrement={() => onDecrement(line.variantId)}
                    onChange={(next) => onSetQuantity(line.variantId, next)}
                    increaseLabel={tCart('increaseQty')}
                    decreaseLabel={tCart('decreaseQty')}
                    className="min-w-[148px] justify-start"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(line.variantId)}
                    aria-label={tCart('removeItem')}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <SheetFooter className="border-t border-border bg-white px-6 py-4">
        <div className="flex w-full flex-col gap-3">
          {/* Footer: clear + submit only — no price/total shown */}
          {lines.length > 0 ? (
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={onClear}>
                {tCart('clear')}
              </Button>
            </div>
          ) : null}
          <Button
            type="button"
            size="lg"
            onClick={onOrder}
            disabled={lines.length === 0 || isOrdering}
            className="w-full rounded-2xl"
          >
            {isOrdering ? tCart('sending') : tCart('submit')}
          </Button>
        </div>
      </SheetFooter>
    </SheetContent>
  );
}
