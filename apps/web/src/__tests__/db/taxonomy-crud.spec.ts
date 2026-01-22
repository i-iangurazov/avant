import { describe, expect, it } from 'vitest';
import { prisma } from '@plumbing/db';
import { POST as createCategory } from '@/app/api/admin/taxonomy/categories/route';
import { POST as createSubcategory } from '@/app/api/admin/taxonomy/subcategories/route';
import { GET as getTaxonomy } from '@/app/api/admin/taxonomy/route';
import { createAdminSession } from './helpers';

const jsonRequest = (url: string, token: string, body: unknown) =>
  new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `session=${token}`,
    },
    body: JSON.stringify(body),
  });

describe('taxonomy admin routes', () => {
  it('creates a category and subcategory', async () => {
    const { token } = await createAdminSession();

    const categoryResponse = await createCategory(
      jsonRequest('http://localhost/api/admin/taxonomy/categories', token, { name: 'Трубы' })
    );

    expect(categoryResponse.status).toBe(200);
    const categoryPayload = (await categoryResponse.json()) as {
      category: { id: string; name: string };
    };
    expect(categoryPayload.category.name).toBe('Трубы');

    const subcategoryResponse = await createSubcategory(
      jsonRequest('http://localhost/api/admin/taxonomy/subcategories', token, {
        name: 'ППР',
        categoryId: categoryPayload.category.id,
      })
    );

    expect(subcategoryResponse.status).toBe(200);
    const subcategoryPayload = (await subcategoryResponse.json()) as {
      subcategory: { id: string; name: string; categoryId: string };
    };

    expect(subcategoryPayload.subcategory.name).toBe('ППР');
    expect(subcategoryPayload.subcategory.categoryId).toBe(categoryPayload.category.id);

    const saved = await prisma.subcategory.findUnique({
      where: { id: subcategoryPayload.subcategory.id },
      include: { translations: true },
    });

    expect(saved?.translations[0]?.name).toBe('ППР');

    const listResponse = await getTaxonomy(
      new Request('http://localhost/api/admin/taxonomy?includeInactive=1', {
        headers: { cookie: `session=${token}` },
      })
    );
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      categories?: Array<{ id: string; subcategories?: Array<{ id: string }> }>;
    };
    const listedCategory = listPayload.categories?.find((item) => item.id === categoryPayload.category.id);
    expect(listedCategory).toBeTruthy();
    expect(listedCategory?.subcategories?.some((item) => item.id === subcategoryPayload.subcategory.id)).toBe(true);
  });
});
