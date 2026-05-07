'use client';

import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Props = {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange: (value: number) => void;
  increaseLabel: string;
  decreaseLabel: string;
  className?: string;
};

export default function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  onChange,
  increaseLabel,
  decreaseLabel,
  className,
}: Props) {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const commitValue = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange(0);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setInputValue(value.toString());
      return;
    }
    onChange(Math.max(0, Math.floor(parsed)));
  };

  return (
    <div className={cn('flex items-center justify-between gap-2 bg-white', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={decreaseLabel}
        onClick={onDecrement}
        disabled={value <= 0}
      >
        <Minus className="size-4" />
      </Button>
      <Input
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={() => commitValue(inputValue)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commitValue(inputValue);
            event.currentTarget.blur();
          }
          if (event.key === 'Escape') {
            setInputValue(value.toString());
            event.currentTarget.blur();
          }
        }}
        onFocus={(event) => event.currentTarget.select()}
        aria-label="Quantity"
        className="h-10 w-16 rounded-xl border border-border bg-white text-center text-base font-semibold text-foreground"
      />
      <Button
        type="button"
        size="icon"
        aria-label={increaseLabel}
        onClick={onIncrement}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
