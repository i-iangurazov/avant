// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import TaxonomyAdmin from '@/components/admin/TaxonomyAdmin';
import IntlProvider from '@/components/IntlProvider';
import messages from '@/messages/en.json';
import ruMessages from '@/messages/ru.json';

describe('TaxonomyAdmin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders and opens edit category dialog', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/admin/taxonomy')) {
        return {
          ok: true,
          json: async () => ({
            categories: [
              {
                id: 'cat-1',
                name: 'Pipes',
                slug: 'pipes',
                sortOrder: 1,
                isActive: true,
                subcategories: [
                  {
                    id: 'sub-1',
                    name: 'PVC',
                    slug: 'pvc',
                    sortOrder: 1,
                    isActive: true,
                    categoryId: 'cat-1',
                  },
                ],
              },
            ],
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock as typeof fetch);

    render(
      <IntlProvider locale="en" messages={messages}>
        <IntlProvider locale="ru" messages={ruMessages} setDocumentLang={false}>
          <TaxonomyAdmin />
        </IntlProvider>
      </IntlProvider>
    );

    expect(await screen.findByText('Таксономия')).toBeInTheDocument();

    const editButtons = screen.getAllByLabelText('Редактировать категорию');
    await userEvent.click(editButtons[0]);

    expect(await screen.findByRole('heading', { name: 'Редактировать категорию' })).toBeInTheDocument();
  });
});
