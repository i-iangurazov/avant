'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  id?: string;
  title: string;
  count: number;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  countClassName?: string;
  contentClassName?: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function CategorySection({
  id,
  title,
  count,
  children,
  className,
  headerClassName,
  titleClassName,
  countClassName,
  contentClassName,
  defaultOpen = false,
  onOpenChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);
  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      onOpenChange?.(next);
      return next;
    });
  };

  return (
    <section id={id} className={cn('scroll-mt-28', className)}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        className={cn(
          'mb-4 flex w-full items-center justify-between gap-3 text-left',
          headerClassName
        )}
      >
        <span className="flex items-center gap-2">
          <ChevronDown className={cn('size-5 transition-transform', isOpen && 'rotate-180')} />
          <span className={cn('text-base font-semibold text-foreground md:text-base', titleClassName)}>
            {title}
          </span>
        </span>
        <span
          className={cn(
            'rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-muted-foreground',
            countClassName
          )}
        >
          {count}
        </span>
      </button>
      {isOpen && <div className={cn('mt-4', contentClassName)}>{children}</div>}
    </section>
  );
}
