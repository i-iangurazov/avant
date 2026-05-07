import { Button } from '@/components/ui/button';

type Props = {
  totalLabel: string;
  totalPrice: string;
  itemCount: number;
  cartLabel: string;
  disabled?: boolean;
  onOpenCart: () => void;
};

export default function FloatingCartBar({
  totalLabel,
  totalPrice,
  itemCount,
  cartLabel,
  disabled,
  onOpenCart,
}: Props) {
  return (
    <div
      data-floating-cart-bar
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-40 w-[min(640px,calc(100%-2rem))] -translate-x-1/2"
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-lg">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {totalLabel}
          </div>
          <div className="text-lg font-semibold text-foreground">{totalPrice}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="lg"
            className="rounded-xl px-5 text-sm font-semibold"
            onClick={onOpenCart}
            disabled={disabled}
          >
            <span>{cartLabel}</span>
            {itemCount > 0 && (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
