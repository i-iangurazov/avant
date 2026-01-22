import type { Metadata } from 'next';
import CustomersAdmin from '@/components/admin/CustomersAdmin';

export const metadata: Metadata = {
  title: 'Клиенты — Админ',
};

export default function CustomersPage() {
  return <CustomersAdmin />;
}
