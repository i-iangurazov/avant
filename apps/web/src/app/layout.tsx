import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { getLocale, getMessages, getTranslations, getTimeZone } from 'next-intl/server';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import IntlProvider from '@/components/IntlProvider';
import PwaRouteServiceWorker from '@/components/PwaRouteServiceWorker';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ff2600',
};

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans-app',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t('common.meta.title'),
    description: t('common.meta.description'),
    manifest: '/manifest.webmanifest',
    applicationName: 'Авантехник',
    appleWebApp: {
      capable: true,
      title: 'Авантехник',
      statusBarStyle: 'default',
    },
    icons: {
      icon: [
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: '/icons/apple-touch-icon.png',
    },
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
          <PwaRouteServiceWorker />
          <Toaster />
        </IntlProvider>
      </body>
    </html>
  );
}
