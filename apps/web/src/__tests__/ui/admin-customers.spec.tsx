// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import CustomersAdmin from '@/components/admin/CustomersAdmin';
import IntlProvider from '@/components/IntlProvider';
import messages from '@/messages/en.json';
import ruMessages from '@/messages/ru.json';

describe('CustomersAdmin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders and opens create dialog', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/admin/customers')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: 'cust-1',
                name: 'Jane Doe',
                phone: '+1 555 0100',
                address: 'Main St',
                isActive: true,
                createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
              },
            ],
            total: 1,
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock as typeof fetch);

    render(
      <IntlProvider locale="en" messages={messages}>
        <IntlProvider locale="ru" messages={ruMessages} setDocumentLang={false}>
          <CustomersAdmin />
        </IntlProvider>
      </IntlProvider>
    );

    expect(await screen.findByText('Клиенты')).toBeInTheDocument();
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Редактировать клиента').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Добавить клиента' }));
    expect(await screen.findByRole('heading', { name: 'Добавить клиента' })).toBeInTheDocument();
    expect(screen.getByLabelText('Телефон')).toBeInTheDocument();
  });
});
