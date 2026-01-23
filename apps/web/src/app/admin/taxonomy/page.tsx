import type { Metadata } from 'next';
import { UserRole } from '@plumbing/db';
import { getSessionUser } from '@/lib/auth/session';
import AdminForbidden from '@/components/admin/AdminForbidden';
import TaxonomyAdmin from '@/components/admin/TaxonomyAdmin';

export const metadata: Metadata = {
  title: 'Категории и подкатегории — Админ',
};

export default async function TaxonomyPage() {
  const user = await getSessionUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return <AdminForbidden />;
  }
  return <TaxonomyAdmin />;
}
