import type { Metadata } from 'next';
import ProductsAdmin from '@/components/admin/ProductsAdmin';

export const metadata: Metadata = {
  title: 'Товары — Админ',
};

export default function ProductsPage() {
  return <ProductsAdmin />;
}
