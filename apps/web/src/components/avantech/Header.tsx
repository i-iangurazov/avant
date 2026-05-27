'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { SearchEntry } from '@plumbing/catalog/catalogApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchWithSuggestions, { type EntryMeta } from './SearchWithSuggestions';

type Props = {
  entries: SearchEntry[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSelect: (entry: SearchEntry) => void;
  formatPrice: (price: number) => string;
  /** Supplies thumbnail URL and category name for each suggestion row. */
  getEntryMeta?: (entry: SearchEntry) => EntryMeta;
  categories: Array<{ id: string; name: string }>;
  subcategories: Array<{ id: string; name: string }>;
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  selectedSubcategoryId: string;
  onSubcategoryChange: (subcategoryId: string) => void;
};

export default function Header({
  entries,
  searchQuery,
  onSearchQueryChange,
  onSelect,
  formatPrice,
  getEntryMeta,
  categories,
  subcategories,
  selectedCategoryId,
  onCategoryChange,
  selectedSubcategoryId,
  onSubcategoryChange,
}: Props) {
  const t = useTranslations('avantech');
  const tSearch = useTranslations('avantech.search');

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
            onSelect={onSelect}
            formatPrice={formatPrice}
            getEntryMeta={getEntryMeta}
          />
          <div className="flex flex-col gap-2">
            <div className="w-full">
              <Select value={selectedCategoryId} onValueChange={onCategoryChange}>
                <SelectTrigger aria-label={tSearch('categoryLabel')} contentId="catalog-category-select">
                  <SelectValue placeholder={tSearch('allCategories')} />
                </SelectTrigger>
                <SelectContent align="start" contentId="catalog-category-select">
                  <SelectItem value="all">{tSearch('allCategories')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCategoryId !== 'all' && subcategories.length > 0 ? (
              <div className="w-full">
                <Select value={selectedSubcategoryId} onValueChange={onSubcategoryChange}>
                  <SelectTrigger aria-label={tSearch('subcategoryLabel')} contentId="catalog-subcategory-select">
                    <SelectValue placeholder={tSearch('allSubcategories')} />
                  </SelectTrigger>
                  <SelectContent align="start" contentId="catalog-subcategory-select">
                    <SelectItem value="all">{tSearch('allSubcategories')}</SelectItem>
                    {subcategories.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
