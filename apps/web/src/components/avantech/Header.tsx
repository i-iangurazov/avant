'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { SearchEntry } from '@/lib/avantech/catalogApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchWithSuggestions from './SearchWithSuggestions';
import LanguageSelect from './LanguageSelect';

type Props = {
  entries: SearchEntry[];
  onSelect: (entry: SearchEntry) => void;
  formatPrice: (price: number) => string;
  categories: Array<{ id: string; name: string }>;
  subcategories: Array<{ id: string; name: string }>;
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  selectedSubcategoryId: string;
  onSubcategoryChange: (subcategoryId: string) => void;
};

export default function Header({
  entries,
  onSelect,
  formatPrice,
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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-white/90 backdrop-blur">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[auto,1fr,auto] md:items-center md:px-6">
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
          <div className="flex items-center gap-2 md:hidden">
            <LanguageSelect contentId="language-select-mobile" />
          </div>
        </div>
        <div className="flex w-full flex-col gap-2">
          <SearchWithSuggestions entries={entries} onSelect={onSelect} formatPrice={formatPrice} />
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
        {selectedCategoryId !== 'all' && subcategories.length > 0 && (
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
          )}
        </div>
        <div className="hidden items-center justify-end gap-2 md:flex">
          <LanguageSelect contentId="language-select-desktop" />
        </div>
      </div>
    </header>
  );
}
