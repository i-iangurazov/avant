'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { SearchEntry } from '@/lib/avantech/catalogApi';
import { cn } from '@/lib/utils';

type Props = {
  entries: SearchEntry[];
  onSelect: (entry: SearchEntry) => void;
  formatPrice: (price: number) => string;
};

export default function SearchWithSuggestions({ entries, onSelect, formatPrice }: Props) {
  const t = useTranslations('avantech.search');
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => entry.searchText.includes(needle)).slice(0, 8);
  }, [entries, query]);

  const safeActiveIndex = useMemo(() => {
    if (!query.trim() || results.length === 0) return -1;
    if (activeIndex < 0) return 0;
    return Math.min(activeIndex, results.length - 1);
  }, [activeIndex, query, results.length]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSelect = (entry: SearchEntry) => {
    setQuery(entry.subtitle);
    setIsOpen(false);
    onSelect(entry);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;
    const currentIndex = safeActiveIndex;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex(Math.min(currentIndex + 1, results.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex(Math.max(currentIndex - 1, 0));
    }
    if (event.key === 'Enter' && currentIndex >= 0) {
      event.preventDefault();
      const entry = results[currentIndex];
      if (entry) handleSelect(entry);
    }
    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;
          const trimmed = nextQuery.trim();
          setQuery(nextQuery);
          if (!trimmed) {
            setIsOpen(false);
            setActiveIndex(-1);
            return;
          }
          if (!isOpen) setIsOpen(true);
          const needle = trimmed.toLowerCase();
          const nextResults = entries.filter((entry) => entry.searchText.includes(needle)).slice(0, 8);
          setActiveIndex(nextResults.length > 0 ? 0 : -1);
        }}
        onFocus={() => {
          if (query.trim()) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={t('placeholder')}
        aria-label={t('placeholder')}
        className="pr-10"
      />
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <Search className="size-4" />
      </div>
      {isOpen && query.trim().length > 0 && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">{t('empty')}</div>
          ) : (
            <ul className="max-h-72 overflow-auto py-1">
              {results.map((entry, idx) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(entry)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition',
                      idx === safeActiveIndex ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <div>
                      <div className="font-semibold text-foreground">{entry.title}</div>
                      <div className={cn('text-xs', idx === activeIndex ? 'text-primary' : 'text-muted-foreground')}>
                        {entry.subtitle}
                        {entry.sku ? ` · ${entry.sku}` : ''}
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground">{formatPrice(entry.price)}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
