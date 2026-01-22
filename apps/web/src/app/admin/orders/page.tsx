import type { Metadata } from 'next';
import OrdersAdmin from '@/components/admin/OrdersAdmin';

export const metadata: Metadata = {
  title: 'Заказы — Админ',
};

export default function OrdersPage() {
  return <OrdersAdmin />;
}
