import type { Metadata } from 'next';
import TaxonomyAdmin from '@/components/admin/TaxonomyAdmin';

export const metadata: Metadata = {
  title: 'Категории и подкатегории — Админ',
};

export default function TaxonomyPage() {
  return <TaxonomyAdmin />;
}
