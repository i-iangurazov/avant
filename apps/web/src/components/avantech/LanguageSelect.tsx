'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useLanguage } from '@/lib/useLanguage';
import type { Language } from '@/lib/i18n';

type Props = {
  contentId: string;
};

export default function LanguageSelect({ contentId }: Props) {
  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const t = useTranslations('common.language');
  const [open, setOpen] = useState(false);
  const labels = {
    en: t('options.en'),
    ru: t('options.ru'),
    kg: t('options.kg'),
  };

  return (
    <div className="flex items-center gap-2">
      <span className="sr-only">{t('label')}</span>
      <Select
        value={lang}
        open={open}
        onOpenChange={setOpen}
        onValueChange={(value) => {
          const next = value as Language;
          if (next === lang) {
            setOpen(false);
            return;
          }
          setLang(next);
          setOpen(false);
          router.refresh();
        }}
      >
      <SelectTrigger className="w-[120px]" aria-label={t('label')} contentId={contentId}>
        <span className="truncate text-left">{labels[lang] ?? labels.ru}</span>
      </SelectTrigger>
      <SelectContent align="end" contentId={contentId}>
        <SelectItem value="en">{t('options.en')}</SelectItem>
        <SelectItem value="ru">{t('options.ru')}</SelectItem>
        <SelectItem value="kg">{t('options.kg')}</SelectItem>
      </SelectContent>
      </Select>
    </div>
  );
}
