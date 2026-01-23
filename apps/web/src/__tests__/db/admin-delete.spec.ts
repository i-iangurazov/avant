import { describe, expect, it } from 'vitest';
import { prisma } from '@plumbing/db';
import { DELETE as deleteCategory } from '@/app/api/admin/taxonomy/categories/[id]/route';
import { DELETE as deleteSubcategory } from '@/app/api/admin/taxonomy/subcategories/[id]/route';
import { DELETE as deleteProduct } from '@/app/api/admin/products/[id]/route';
import { DELETE as deleteCustomer } from '@/app/api/admin/customers/[id]/route';
import {
  createAdminSession,
  createCategory,
  createProduct,
  createSubcategory,
  createVariant,
  createUser,
} from './helpers';

const deleteRequest = (url: string, token: string) =>
  new Request(url, {
    method: 'DELETE',
    headers: { cookie: `session=${token}` },
  });

describe('admin delete constraints', () => {
  it('blocks deleting category with products', async () => {
    const { token } = await createAdminSession();
    const category = await createCategory({ name: 'Удаление категорий' });
    await createProduct({ categoryId: category.id, name: 'Товар 1' });

    const response = await deleteCategory(
      deleteRequest(`http://localhost/api/admin/taxonomy/categories/${category.id}`, token),
      { params: Promise.resolve({ id: category.id }) }
    );

    expect(response.status).toBe(409);
    const saved = await prisma.category.findUnique({ where: { id: category.id } });
    expect(saved).toBeTruthy();
  });

  it('blocks deleting subcategory with products', async () => {
    const { token } = await createAdminSession();
    const category = await createCategory({ name: 'Удаление подкатегорий' });
    const subcategory = await createSubcategory({ categoryId: category.id, name: 'Подкатегория' });
    await createProduct({ categoryId: category.id, subcategoryId: subcategory.id, name: 'Товар 2' });

    const response = await deleteSubcategory(
      deleteRequest(`http://localhost/api/admin/taxonomy/subcategories/${subcategory.id}`, token),
      { params: Promise.resolve({ id: subcategory.id }) }
    );

    expect(response.status).toBe(409);
    const saved = await prisma.subcategory.findUnique({ where: { id: subcategory.id } });
    expect(saved).toBeTruthy();
  });

  it('blocks deleting product referenced by orders', async () => {
    const { token } = await createAdminSession();
    const category = await createCategory({ name: 'Удаление товаров' });
    const product = await createProduct({ categoryId: category.id, name: 'Товар 3' });
    const variant = await createVariant({ productId: product.id, label: 'Вариант', price: 150 });

    await prisma.storeOrder.create({
      data: {
        total: 150,
        items: [{ variantId: variant.id }],
      },
    });

    const response = await deleteProduct(
      deleteRequest(`http://localhost/api/admin/products/${product.id}`, token),
      { params: Promise.resolve({ id: product.id }) }
    );

    expect(response.status).toBe(409);
    const saved = await prisma.product.findUnique({ where: { id: product.id } });
    expect(saved).toBeTruthy();
  });

  it('blocks deleting customer with orders', async () => {
    const { token } = await createAdminSession();
    const customer = await createUser({ phone: '+996700000333' });

    await prisma.storeOrder.create({
      data: {
        total: 200,
        items: [],
        userId: customer.id,
      },
    });

    const response = await deleteCustomer(
      deleteRequest(`http://localhost/api/admin/customers/${customer.id}`, token),
      { params: Promise.resolve({ id: customer.id }) }
    );

    expect(response.status).toBe(409);
    const saved = await prisma.user.findUnique({ where: { id: customer.id } });
    expect(saved).toBeTruthy();
  });

  it('allows deleting multiple products sequentially', async () => {
    const { token } = await createAdminSession();
    const category = await createCategory({ name: 'Массовое удаление' });
    const productA = await createProduct({ categoryId: category.id, name: 'Товар A' });
    const productB = await createProduct({ categoryId: category.id, name: 'Товар B' });

    const responseA = await deleteProduct(
      deleteRequest(`http://localhost/api/admin/products/${productA.id}`, token),
      { params: Promise.resolve({ id: productA.id }) }
    );
    const responseB = await deleteProduct(
      deleteRequest(`http://localhost/api/admin/products/${productB.id}`, token),
      { params: Promise.resolve({ id: productB.id }) }
    );

    expect(responseA.status).toBe(200);
    expect(responseB.status).toBe(200);

    const remaining = await prisma.product.findMany({ where: { id: { in: [productA.id, productB.id] } } });
    expect(remaining.length).toBe(0);
  });
});
