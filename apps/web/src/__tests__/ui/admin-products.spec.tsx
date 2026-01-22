// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import ProductsAdmin from '@/components/admin/ProductsAdmin';
import IntlProvider from '@/components/IntlProvider';
import messages from '@/messages/en.json';
import ruMessages from '@/messages/ru.json';

describe('ProductsAdmin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders and adds/removes variants', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/admin/taxonomy')) {
        return {
          ok: true,
          json: async () => ({
            categories: [{ id: 'cat-1', name: 'Pipes', subcategories: [] }],
          }),
        } as Response;
      }
      if (url.includes('/api/admin/products')) {
        return { ok: true, json: async () => ({ items: [], total: 0 }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock as typeof fetch);

    render(
      <IntlProvider locale="en" messages={messages}>
        <IntlProvider locale="ru" messages={ruMessages} setDocumentLang={false}>
          <ProductsAdmin />
        </IntlProvider>
      </IntlProvider>
    );

    expect(await screen.findByText('Товары')).toBeInTheDocument();

    const addButtons = screen.getAllByRole('button', { name: 'Добавить товар' });
    await userEvent.click(addButtons[0]);
    const initial = screen.getAllByPlaceholderText('Название варианта').length;

    await userEvent.click(screen.getByRole('button', { name: 'Добавить вариант' }));
    expect(screen.getAllByPlaceholderText('Название варианта').length).toBe(initial + 1);

    const removeButtons = screen.getAllByRole('button', { name: 'Удалить вариант' });
    await userEvent.click(removeButtons[1]);
    expect(screen.getAllByPlaceholderText('Название варианта').length).toBe(initial);

    const titleInput = await screen.findByLabelText(/Название \(RU\)/i);
    await userEvent.type(titleInput, 'Test product');
    await userEvent.click(screen.getByRole('button', { name: 'Создать товар' }));
    expect(await screen.findByText('Название варианта обязательно.')).toBeInTheDocument();
  });
});
