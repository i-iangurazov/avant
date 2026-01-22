import type { Metadata } from 'next';
import { getLocale, getMessages, getTranslations, getTimeZone } from 'next-intl/server';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import IntlProvider from '@/components/IntlProvider';
import PwaAutoReload from '@/components/PwaAutoReload';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t('common.meta.title'),
    description: t('common.meta.description'),
    manifest: '/manifest.webmanifest',
    applicationName: 'Авантехник',
    themeColor: '#ff2600',
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
      <body className="font-sans antialiased">
        <IntlProvider locale={locale} messages={messages} timeZone={timeZone}>
          <PwaAutoReload />
          {children}
          <Toaster />
        </IntlProvider>
      </body>
    </html>
  );
}
