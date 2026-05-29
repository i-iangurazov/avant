'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchCatalogEntries, type SearchEntry } from '@plumbing/catalog/catalogApi';
import { cn } from '@/lib/utils';
import { BLUR_SLATE } from '@/lib/imagePlaceholder';

/** Metadata resolved per entry — passed from the parent so this component stays generic. */
export type EntryMeta = {
  imageUrl: string | null;
};

type Props = {
  entries: SearchEntry[];
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: (query: string) => void;
  onSelect: (entry: SearchEntry) => void;
  formatPrice: (price: number) => string;
  /** Optional: supplies thumbnail URL for each suggestion row. */
  getEntryMeta?: (entry: SearchEntry) => EntryMeta;
};

/** Highlights the first occurrence of `query` inside `text` with a mark element. */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  const idx = lower.indexOf(lowerQ);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-[2px] bg-amber-100 font-semibold not-italic text-amber-900">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function SearchWithSuggestions({
  entries,
  query,
  onQueryChange,
  onSubmit,
  onSelect,
  formatPrice,
  getEntryMeta,
}: Props) {
  const t = useTranslations('avantech.search');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  // Debounced query used for filtering — prevents excessive recomputation while typing.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 200);
    return () => window.clearTimeout(id);
  }, [query]);

  // Show up to 15 suggestions at a time.
  const results = useMemo(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) return [];
    return searchCatalogEntries(entries, trimmed, 15);
  }, [entries, debouncedQuery]);

  const safeActiveIndex = useMemo(() => {
    if (!query.trim() || results.length === 0) return -1;
    if (activeIndex < 0) return 0;
    return Math.min(activeIndex, results.length - 1);
  }, [activeIndex, query, results.length]);

  // Close dropdown on outside click.
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

  // Scroll the active item into view inside the dropdown list.
  useEffect(() => {
    if (safeActiveIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[safeActiveIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [safeActiveIndex]);

  const commitSearch = () => {
    setIsOpen(false);
    setActiveIndex(-1);
    onSubmit(query);
    inputRef.current?.blur();
  };

  const handleSelect = (entry: SearchEntry) => {
    setIsOpen(false);
    setActiveIndex(-1);
    onSelect(entry);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      commitSearch();
    }
    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  const showDropdown = isOpen && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          commitSearch();
        }}
      >
        <Input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            const trimmed = nextQuery.trim();
            onQueryChange(nextQuery);
            if (!trimmed) {
              setIsOpen(false);
              setActiveIndex(-1);
              return;
            }
            if (!isOpen) setIsOpen(true);
            // Reset active index when query changes so first result gets focus.
            setActiveIndex(0);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          className="pr-11 text-base md:text-sm"
        />
        <button
          type="submit"
          aria-label={t('submitLabel')}
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Search className="size-4" />
        </button>
      </form>

      {showDropdown && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          {results.length === 0 ? (
            /* "No results for X" state — shown after debounce settles */
            <div className="px-4 py-4 text-sm text-muted-foreground">
              {t('noResultsFor', { query: debouncedQuery.trim() })}
            </div>
          ) : (
            /* Up to 15 results; scrollable so the dropdown never overflows the viewport */
            <ul
              ref={listRef}
              role="listbox"
              aria-label={t('placeholder')}
              className="max-h-[480px] overflow-y-auto py-1"
            >
              {results.map((entry, idx) => {
                const meta = getEntryMeta ? getEntryMeta(entry) : null;
                const isActive = idx === safeActiveIndex;

                return (
                  <li key={entry.id} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(entry)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition',
                        isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                      )}
                    >
                      {/* Product thumbnail */}
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-slate-100">
                        {meta?.imageUrl ? (
                          <Image
                            src={meta.imageUrl}
                            alt={entry.title}
                            fill
                            sizes="40px"
                            className="object-cover"
                            placeholder="blur"
                            blurDataURL={BLUR_SLATE}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[8px] font-semibold uppercase text-muted-foreground">
                            Avant
                          </div>
                        )}
                      </div>

                      {/* Product name + subtitle */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-foreground">
                          <HighlightMatch text={entry.title} query={debouncedQuery} />
                        </div>
                        {entry.subtitle ? (
                          <div
                            className={cn(
                              'truncate text-xs',
                              isActive ? 'text-primary/70' : 'text-muted-foreground'
                            )}
                          >
                            {entry.subtitle}
                            {entry.sku ? ` · ${entry.sku}` : ''}
                          </div>
                        ) : null}
                      </div>

                      {/* Price */}
                      <div className="shrink-0 text-xs font-semibold text-muted-foreground">
                        {formatPrice(entry.price)}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
