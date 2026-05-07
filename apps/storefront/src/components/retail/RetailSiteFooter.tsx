'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Instagram, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Props = {
  categoryLinks?: Array<{ href: string; label: string }>;
  basePath?: string;
};

export default function RetailSiteFooter({ categoryLinks = [], basePath = '' }: Props) {
  const tBrand = useTranslations('avantech');
  const tFooter = useTranslations('retail.footer');
  const tHeader = useTranslations('retail.header');
  const normalizedBasePath = basePath.replace(/\/$/, '');
  const homeHref = normalizedBasePath || '/';
  const shopHref = normalizedBasePath ? `${normalizedBasePath}/shop` : '/shop';

  return (
    <footer className="border-t border-border/70 bg-[#111827] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.2fr,0.8fr,0.8fr] md:px-6">
        <div className="space-y-4">
          <Image
            src="/avantech/avant-logo.png"
            alt={tBrand('brand')}
            width={164}
            height={40}
            className="h-10 w-auto brightness-[1.2] contrast-125"
          />
          <p className="max-w-md text-sm leading-6 text-white/75">{tFooter('description')}</p>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://instagram.com/avant_santex"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <Instagram className="size-4" />
              <span>@avant_santex</span>
            </a>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3 py-2 text-sm text-white/80">
              <MapPin className="size-4" />
              <span>{tHeader('city')}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-white/50">
            {tFooter('navigationTitle')}
          </div>
          <div className="flex flex-col gap-2 text-sm text-white/75">
            <Link href={homeHref} className="transition hover:text-white">
              {tHeader('home')}
            </Link>
            <Link href={shopHref} className="transition hover:text-white">
              {tHeader('shop')}
            </Link>
            <Link href="/login" className="transition hover:text-white">
              {tHeader('login')}
            </Link>
          </div>
        </div>

        <div>
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-white/50">
            {tFooter('categoriesTitle')}
          </div>
          <div className="flex flex-col gap-2 text-sm text-white/75">
            {categoryLinks.length > 0 ? (
              categoryLinks.map((link) => (
                <Link key={link.href} href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              ))
            ) : (
              <div>{tFooter('categoriesFallback')}</div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
