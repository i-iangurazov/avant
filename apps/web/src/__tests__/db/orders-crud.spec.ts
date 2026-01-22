import { describe, expect, it } from 'vitest';
import { prisma } from '@plumbing/db';
import { POST as createOrder } from '@/app/api/admin/orders/route';
import { GET as getOrder } from '@/app/api/admin/orders/[id]/route';
import { createAdminSession, createCategory, createProduct, createVariant, createUser } from './helpers';

const jsonRequest = (url: string, token: string, body: unknown) =>
  new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `session=${token}`,
    },
    body: JSON.stringify(body),
  });

describe('orders admin routes', () => {
  it('creates an order with items', async () => {
    const { token } = await createAdminSession();
    const customer = await createUser({ phone: '+996700000555' });
    const category = await createCategory({ name: 'Pipes' });
    const product = await createProduct({ categoryId: category.id, name: 'Pipe 1/2' });
    const variant = await createVariant({ productId: product.id, label: '1/2"', price: 120 });

    const response = await createOrder(
      jsonRequest('http://localhost/api/admin/orders', token, {
        userId: customer.id,
        items: [{ variantId: variant.id, quantity: 2, unitPrice: 120 }],
      })
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { order: { id: string; total: number } };
    expect(payload.order.total).toBe(240);

    const saved = await prisma.storeOrder.findUnique({ where: { id: payload.order.id } });
    expect(saved?.userId).toBe(customer.id);
    const items = Array.isArray(saved?.items) ? (saved?.items as Array<Record<string, unknown>>) : [];
    expect(items.length).toBe(1);
    expect(items[0]?.productName).toBeDefined();

    const detailResponse = await getOrder(
      new Request(`http://localhost/api/admin/orders/${payload.order.id}`, {
        headers: { cookie: `session=${token}` },
      }),
      { params: Promise.resolve({ id: payload.order.id }) }
    );

    expect(detailResponse.status).toBe(200);
    const detailPayload = (await detailResponse.json()) as { order?: { id: string; items: unknown[] } };
    expect(detailPayload.order?.id).toBe(payload.order.id);
    expect(Array.isArray(detailPayload.order?.items)).toBe(true);
  });
});
