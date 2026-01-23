import type { Metadata } from 'next';
import { UserRole } from '@plumbing/db';
import { getSessionUser } from '@/lib/auth/session';
import AdminForbidden from '@/components/admin/AdminForbidden';
import CustomersAdmin from '@/components/admin/CustomersAdmin';

export const metadata: Metadata = {
  title: 'Клиенты — Админ',
};

export default async function CustomersPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.CLIENTS_MANAGER)) {
    return <AdminForbidden />;
  }
  return <CustomersAdmin />;
}
