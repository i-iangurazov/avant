import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTimeZone } from 'next-intl/server';
import { UserRole } from '@plumbing/db';
import { getSessionUser } from '@/lib/auth/session';
import IntlProvider from '@/components/IntlProvider';
import AdminForbidden from '@/components/admin/AdminForbidden';
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
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.CLIENTS_MANAGER) {
    return <AdminForbidden />;
  }

  const timeZone = await getTimeZone();

  const navItems: Array<{ href: string; label: string; roles: UserRole[] }> = [
    { href: '/admin/customers', label: 'Клиенты', roles: [UserRole.ADMIN, UserRole.CLIENTS_MANAGER] },
    { href: '/admin/orders', label: 'Заказы', roles: [UserRole.ADMIN] },
    { href: '/admin/products', label: 'Товары', roles: [UserRole.ADMIN] },
    { href: '/admin/taxonomy', label: 'Категории', roles: [UserRole.ADMIN] },
  ].filter((item) => item.roles.includes(user.role));

  return (
    <IntlProvider locale="ru" messages={ruMessages} timeZone={timeZone} setDocumentLang={false}>
      <div className="bg-white text-foreground">
        <div className="border-b border-border/60">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-brandTint/70 hover:bg-brandTint/20"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        {children}
      </div>
    </IntlProvider>
  );
}
