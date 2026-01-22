import { redirect } from 'next/navigation';
import { getTimeZone } from 'next-intl/server';
import { UserRole } from '@plumbing/db';
import { getSessionUser } from '@/lib/auth/session';
import IntlProvider from '@/components/IntlProvider';
import ruMessages from '@/messages/ru.json';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }
  if (user.role !== UserRole.ADMIN) {
    return (
      <div className="min-h-screen bg-white text-foreground">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4 py-10">
          <h1 className="text-2xl font-semibold">Доступ запрещён</h1>
          <p className="text-sm text-muted-foreground">
            У вас нет прав для доступа к этому разделу.
          </p>
        </div>
      </div>
    );
  }

  const timeZone = await getTimeZone();

  return (
    <IntlProvider
      locale="ru"
      messages={ruMessages}
      timeZone={timeZone}
      setDocumentLang={false}
    >
      {children}
    </IntlProvider>
  );
}
