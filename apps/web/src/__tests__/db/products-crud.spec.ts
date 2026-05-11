import { describe, expect, it, vi } from 'vitest';
import { prisma, Locale } from '@plumbing/db';
import { POST as createProduct } from '@/app/api/admin/products/route';
import { PATCH as updateProduct } from '@/app/api/admin/products/[id]/route';
import { POST as duplicateProduct } from '@/app/api/admin/products/[id]/duplicate/route';
import { createAdminSession, createCategory, createClientsManagerSession } from './helpers';

vi.mock('@/lib/images/storage', () => ({
  uploadToStorage: vi.fn(async ({ key }: { key: string }) => `https://cdn.example.com/${key}`),
}));

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

  it('creates a product with a long image URL', async () => {
    const { token } = await createAdminSession();
    const category = await createCategory({ name: 'Длинные ссылки' });
    const imageUrl = `https://example.com/products/${'a'.repeat(3000)}.png?token=${'b'.repeat(1200)}`;

    const response = await createProduct(
      jsonRequest('http://localhost/api/admin/products', token, {
        name: 'Товар с длинной ссылкой',
        categoryId: category.id,
        imageUrl,
        variants: [{ label: '1 шт', price: 120 }],
      })
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { product: { id: string } };
    const product = await prisma.product.findUnique({ where: { id: payload.product.id } });
    expect(product?.imageUrl).toBe(imageUrl);
  });

  it('uploads data URL image sources before creating a product', async () => {
    const { token } = await createAdminSession();
    const category = await createCategory({ name: 'Data URL' });
    const imageDataUrl = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')}`;

    const response = await createProduct(
      jsonRequest('http://localhost/api/admin/products', token, {
        name: 'Товар с data URL',
        categoryId: category.id,
        imageUrl: imageDataUrl,
        variants: [{ label: '1 шт', price: 120 }],
      })
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { product: { id: string } };
    const product = await prisma.product.findUnique({ where: { id: payload.product.id } });
    expect(product?.imageUrl).toMatch(/^https:\/\/cdn\.example\.com\/products\/.+\.png$/);
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

  it('uploads data URL image sources before updating a product', async () => {
    const { token } = await createAdminSession();
    const category = await createCategory({ name: 'Обновление картинки' });

    const createResponse = await createProduct(
      jsonRequest('http://localhost/api/admin/products', token, {
        name: 'Товар',
        categoryId: category.id,
        variants: [{ label: '1 шт', price: 120 }],
      })
    );
    expect(createResponse.status).toBe(200);
    const createPayload = (await createResponse.json()) as { product: { id: string } };

    const imageDataUrl = `data:image/gif;base64,${Buffer.from('GIF89a', 'ascii').toString('base64')}`;
    const updateResponse = await updateProduct(
      jsonRequest(
        `http://localhost/api/admin/products/${createPayload.product.id}`,
        token,
        {
          name: 'Товар',
          categoryId: category.id,
          subcategoryId: null,
          imageUrl: imageDataUrl,
          sortOrder: 0,
          isActive: true,
          variants: [{ label: '1 шт', price: 120 }],
        },
        'PATCH'
      ),
      { params: Promise.resolve({ id: createPayload.product.id }) }
    );

    expect(updateResponse.status).toBe(200);
    const product = await prisma.product.findUnique({ where: { id: createPayload.product.id } });
    expect(product?.imageUrl).toMatch(/^https:\/\/cdn\.example\.com\/products\/.+\.gif$/);
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

  it('duplicates a product with variants', async () => {
    const { token } = await createAdminSession();
    const category = await createCategory({ name: 'Дубликаты' });

    const original = await prisma.product.create({
      data: {
        categoryId: category.id,
        subcategoryId: null,
        sortOrder: 5,
        slug: null,
        imageUrl: 'https://example.com/original.png',
        description: 'Описание',
        isActive: false,
        translations: {
          create: [
            { locale: Locale.ru, name: 'Тестовый товар', description: 'Описание' },
            { locale: Locale.en, name: 'Test item', description: null },
          ],
        },
        variants: {
          create: [
            {
              price: 100,
              priceRetail: 110,
              sku: 'SKU-1',
              isActive: false,
              attributes: {},
              translations: {
                create: [
                  { locale: Locale.ru, label: 'Вариант 1' },
                  { locale: Locale.en, label: 'Variant 1' },
                ],
              },
            },
          ],
        },
      },
    });

    const response = await duplicateProduct(
      new Request(`http://localhost/api/admin/products/${original.id}/duplicate`, {
        method: 'POST',
        headers: { cookie: `session=${token}` },
      }),
      { params: Promise.resolve({ id: original.id }) }
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { product: { id: string } };
    expect(payload.product.id).not.toBe(original.id);

    const duplicated = await prisma.product.findUnique({
      where: { id: payload.product.id },
      include: { translations: true, variants: { include: { translations: true } } },
    });

    expect(duplicated?.isActive).toBe(true);
    const ruTranslation = duplicated?.translations.find((t) => t.locale === Locale.ru);
    const enTranslation = duplicated?.translations.find((t) => t.locale === Locale.en);
    expect(ruTranslation?.name).toBe('Тестовый товар (копия)');
    expect(enTranslation?.name).toBe('Test item');
    expect(duplicated?.variants.length).toBe(1);
    const variant = duplicated?.variants[0];
    const ruLabel = variant?.translations.find((t) => t.locale === Locale.ru)?.label;
    expect(ruLabel).toBe('Вариант 1');
    expect(variant?.price).toBe(100);
    expect(variant?.priceRetail).toBe(110);
    expect(variant?.sku).toBeNull();
    expect(variant?.isActive).toBe(true);
  });
});
