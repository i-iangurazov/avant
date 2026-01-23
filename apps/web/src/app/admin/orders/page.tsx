import type { Metadata } from 'next';
import { UserRole } from '@plumbing/db';
import { getSessionUser } from '@/lib/auth/session';
import AdminForbidden from '@/components/admin/AdminForbidden';
import OrdersAdmin from '@/components/admin/OrdersAdmin';

export const metadata: Metadata = {
  title: 'Заказы — Админ',
};

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return <AdminForbidden />;
  }
  return <OrdersAdmin />;
}
