import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getLocale, getMessages, getTranslations, getTimeZone } from 'next-intl/server';
import './globals.css';
import IntlProvider from '@/components/IntlProvider';
import { Toaster } from '@/components/ui/sonner';

export const dynamic = 'force-dynamic';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans-app',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t('retail.meta.homeTitle'),
    description: t('retail.meta.homeDescription'),
    applicationName: 'Avant Santex Storefront',
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const timeZone = await getTimeZone();

  return (
    <html lang={locale}>
      <body className={`${inter.variable} font-sans antialiased`}>
        <IntlProvider locale={locale} messages={messages} timeZone={timeZone}>
          {children}
          <Toaster />
        </IntlProvider>
      </body>
    </html>
  );
}
