import { describe, expect, it } from 'vitest';
import { prisma } from '@plumbing/db';
import { POST as createProduct } from '@/app/api/admin/products/route';
import { PATCH as updateProduct } from '@/app/api/admin/products/[id]/route';
import { createAdminSession, createCategory, createClientsManagerSession } from './helpers';

const jsonRequest = (url: string, token: string, body: unknown, method = 'POST') =>
  new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      cookie: `session=${token}`,
    },
    body: JSON.stringify(body),
  });

describe('products admin routes', () => {
  it('creates a product with two variants', async () => {
    const { token } = await createAdminSession();
    const category = await createCategory({ name: 'Фитинги' });

    const response = await createProduct(
      jsonRequest('http://localhost/api/admin/products', token, {
        name: 'ППР муфта',
        categoryId: category.id,
        imageUrl: 'https://example.com/product.png',
        variants: [
          { label: '20 мм', price: 120 },
          { label: '25 мм', price: 140 },
        ],
      })
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { product: { id: string } };

    const product = await prisma.product.findUnique({
      where: { id: payload.product.id },
      include: { variants: { include: { translations: true } } },
    });

    expect(product).toBeTruthy();
    expect(product?.imageUrl).toBe('https://example.com/product.png');
    expect(product?.variants.length).toBe(2);
    expect(product?.variants[0]?.translations[0]?.label).toBe('20 мм');
  });

  it('updates a product and replaces variants', async () => {
    const { token } = await createAdminSession();
    const category = await createCategory({ name: 'Аксессуары' });

    const createResponse = await createProduct(
      jsonRequest('http://localhost/api/admin/products', token, {
        name: 'ППР муфта',
        categoryId: category.id,
        variants: [{ label: '20 мм', price: 120 }],
      })
    );

    expect(createResponse.status).toBe(200);
    const createPayload = (await createResponse.json()) as { product: { id: string } };

    const updateResponse = await updateProduct(
      jsonRequest(
        `http://localhost/api/admin/products/${createPayload.product.id}`,
        token,
        {
          name: 'ППР муфта обновленная',
          categoryId: category.id,
          subcategoryId: null,
          imageUrl: null,
          sortOrder: 0,
          isActive: true,
          variants: [
            { label: '32 мм', price: 220 },
            { label: '40 мм', price: 260 },
          ],
        },
        'PATCH'
      ),
      { params: Promise.resolve({ id: createPayload.product.id }) }
    );

    expect(updateResponse.status).toBe(200);

    const updated = await prisma.product.findUnique({
      where: { id: createPayload.product.id },
      include: { variants: { include: { translations: true } } },
    });

    const labels = updated?.variants.map((variant) => variant.translations[0]?.label ?? '').sort() ?? [];
    expect(updated?.variants.length).toBe(2);
    expect(labels).toEqual(['32 мм', '40 мм']);
  });

  it('rejects clients manager access', async () => {
    const { token } = await createClientsManagerSession();
    const response = await createProduct(
      jsonRequest('http://localhost/api/admin/products', token, {
        name: 'Запрещённый товар',
        categoryId: 'missing',
        variants: [{ label: '20 мм', price: 120 }],
      })
    );

    expect(response.status).toBe(403);
  });
});
