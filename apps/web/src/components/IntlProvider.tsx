'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import en from '@/messages/en.json';
import kg from '@/messages/kg.json';
import ru from '@/messages/ru.json';
import { defaultLocale, isLanguage, LOCALE_COOKIE, type Language } from '@/lib/i18n';

type Props = {
  locale: string;
  messages: AbstractIntlMessages;
  timeZone?: string;
  setDocumentLang?: boolean;
  children: React.ReactNode;
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const messagesByLocale: Record<Language, AbstractIntlMessages> = {
  en,
  ru,
  kg,
};

export type LanguageContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);

export default function IntlProvider({ locale, messages, timeZone, setDocumentLang = true, children }: Props) {
  const initialLocale = useMemo(
    () => (isLanguage(locale) ? (locale as Language) : defaultLocale),
    [locale]
  );
  const [activeLocale, setActiveLocale] = useState<Language>(initialLocale);
  const activeMessages = useMemo(
    () => messagesByLocale[activeLocale] ?? messages,
    [activeLocale, messages]
  );

  const setLang = useCallback(
    (next: Language) => {
      if (next === activeLocale) return;
      setActiveLocale(next);
      if (typeof document !== 'undefined') {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}`;
      }
    },
    [activeLocale]
  );

  useEffect(() => {
    if (typeof document !== 'undefined' && setDocumentLang) {
      document.documentElement.lang = activeLocale;
    }
  }, [activeLocale, setDocumentLang]);

  return (
    <LanguageContext.Provider value={{ lang: activeLocale, setLang }}>
      <NextIntlClientProvider
        key={activeLocale}
        locale={activeLocale}
        messages={activeMessages}
        timeZone={timeZone}
        onError={(error) => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(error);
          }
        }}
        getMessageFallback={({ namespace, key }) => {
          const fullKey = namespace ? `${namespace}.${key}` : key;
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`Missing translation: ${fullKey}`);
          }
          return fullKey;
        }}
      >
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
}
