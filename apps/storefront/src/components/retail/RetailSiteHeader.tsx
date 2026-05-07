'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LanguageSelect from '@/components/avantech/LanguageSelect';

type Props = {
  cartCount?: number;
  onOpenCart?: () => void;
  basePath?: string;
};

const isActive = (pathname: string, href: string, exact = false) => {
  if (href === '/' || exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function RetailSiteHeader({ cartCount = 0, onOpenCart, basePath = '' }: Props) {
  const pathname = usePathname();
  const tHeader = useTranslations('retail.header');
  const tBrand = useTranslations('avantech');
  const normalizedBasePath = basePath.replace(/\/$/, '');
  const homeHref = normalizedBasePath || '/';
  const shopHref = normalizedBasePath ? `${normalizedBasePath}/shop` : '/shop';

  const navItems = [
    { href: homeHref, label: tHeader('home'), exact: true },
    { href: shopHref, label: tHeader('shop'), exact: false },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
        <Link href={homeHref} className="flex min-w-0 items-center">
          <Image
            src="/avantech/avant-logo.png"
            alt={tBrand('brand')}
            width={164}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                isActive(pathname, item.href, item.exact)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {onOpenCart ? (
            <Button type="button" size="sm" className="rounded-full px-4" onClick={onOpenCart}>
              <ShoppingBag className="size-4" />
              <span>{tHeader('cart')}</span>
              {cartCount > 0 ? (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
                  {cartCount}
                </span>
              ) : null}
            </Button>
          ) : null}

          <LanguageSelect contentId={onOpenCart ? 'retail-language-shop' : 'retail-language-home'} />
        </div>
      </div>

      <div className="border-t border-border/50 bg-white/75 md:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition',
                isActive(pathname, item.href, item.exact)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
