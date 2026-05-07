'use client';

import { useContext } from 'react';
import { LanguageContext } from '@/components/IntlProvider';
import { defaultLocale, type Language } from './i18n';

const fallbackSetLang = () => {};

export function useLanguage(): { lang: Language; setLang: (lang: Language) => void } {
  const context = useContext(LanguageContext);
  if (!context) {
    return { lang: defaultLocale, setLang: fallbackSetLang };
  }
  return context;
}
