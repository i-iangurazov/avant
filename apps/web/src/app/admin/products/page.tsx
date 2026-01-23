import type { Metadata } from 'next';
import { UserRole } from '@plumbing/db';
import { getSessionUser } from '@/lib/auth/session';
import AdminForbidden from '@/components/admin/AdminForbidden';
import ProductsAdmin from '@/components/admin/ProductsAdmin';

export const metadata: Metadata = {
  title: 'Товары — Админ',
};

export default async function ProductsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return <AdminForbidden />;
  }
  return <ProductsAdmin />;
}
