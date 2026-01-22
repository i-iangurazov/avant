// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import OrdersAdmin from '@/components/admin/OrdersAdmin';
import IntlProvider from '@/components/IntlProvider';
import messages from '@/messages/en.json';
import ruMessages from '@/messages/ru.json';

describe('OrdersAdmin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders and opens create sheet', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/admin/orders')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: 'order-12345678',
                status: 'NEW',
                total: 1500,
                locale: 'en',
                createdAt: new Date('2024-01-02T12:00:00.000Z').toISOString(),
                updatedAt: new Date('2024-01-02T12:00:00.000Z').toISOString(),
                customer: {
                  id: 'cust-1',
                  name: 'Alex Smith',
                  phone: '+1 555 0200',
                  address: 'Market St',
                  isActive: true,
                },
                itemsSummary: 'Pipe kit · 2 items',
              },
            ],
            total: 1,
          }),
        } as Response;
      }
      if (url.includes('/api/catalog')) {
        return { ok: true, json: async () => ({ categories: [] }) } as Response;
      }
      if (url.includes('/api/admin/customers')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              { id: 'cust-1', name: 'Alex Smith', phone: '+1 555 0200', address: 'Market St' },
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
          <OrdersAdmin />
        </IntlProvider>
      </IntlProvider>
    );

    expect(await screen.findByText('Заказы')).toBeInTheDocument();
    expect(screen.getByLabelText('Открыть заказ')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Создать заказ' }));
    expect(await screen.findByRole('heading', { name: 'Создать заказ' })).toBeInTheDocument();
    expect(screen.getByLabelText('Клиент')).toBeInTheDocument();
  });
});
