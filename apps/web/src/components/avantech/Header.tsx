'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { SearchEntry } from '@plumbing/catalog/catalogApi';
import SearchWithSuggestions, { type EntryMeta } from './SearchWithSuggestions';

type Props = {
  entries: SearchEntry[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  onSelect: (entry: SearchEntry) => void;
  formatPrice: (price: number) => string;
  /** Supplies thumbnail URL for each suggestion row. */
  getEntryMeta?: (entry: SearchEntry) => EntryMeta;
};

export default function Header({
  entries,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  onSelect,
  formatPrice,
  getEntryMeta,
}: Props) {
  const t = useTranslations('avantech');

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[auto,1fr] md:items-center md:px-6">
        <div className="flex items-center justify-between gap-3 md:justify-start">
          <div className="flex items-center">
            <Image
              src="/avantech/avant-logo.png"
              alt={t('brand')}
              width={160}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </div>
        </div>
        <div className="flex w-full flex-col gap-2">
          <SearchWithSuggestions
            entries={entries}
            query={searchQuery}
            onQueryChange={onSearchQueryChange}
            onSubmit={onSearchSubmit}
            onSelect={onSelect}
            formatPrice={formatPrice}
            getEntryMeta={getEntryMeta}
          />
        </div>
      </div>
    </header>
  );
}
