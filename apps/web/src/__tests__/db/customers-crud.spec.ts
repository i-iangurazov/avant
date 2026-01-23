import { describe, expect, it } from 'vitest';
import { prisma, UserRole } from '@plumbing/db';
import { POST as createCustomer } from '@/app/api/admin/customers/route';
import { GET as listCustomers } from '@/app/api/admin/customers/route';
import { PATCH as updateCustomer } from '@/app/api/admin/customers/[id]/route';
import { createAdminSession, createClientsManagerSession } from './helpers';

const jsonRequest = (url: string, token: string, body: unknown) =>
  new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `session=${token}`,
    },
    body: JSON.stringify(body),
  });

describe('customers admin routes', () => {
  it('creates a customer', async () => {
    const { token } = await createAdminSession();

    const response = await createCustomer(
      jsonRequest('http://localhost/api/admin/customers', token, {
        name: 'Test Customer',
        phone: '+996700000123',
        address: 'Test address',
        password: 'Password123',
      })
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { customer: { id: string; phone: string } };
    expect(payload.customer.phone).toBe('+996700000123');

    const saved = await prisma.user.findUnique({ where: { id: payload.customer.id } });
    expect(saved?.role).toBe(UserRole.USER);
    expect(saved?.isActive).toBe(true);

    const listResponse = await listCustomers(
      new Request('http://localhost/api/admin/customers?page=1&pageSize=10', {
        headers: { cookie: `session=${token}` },
      })
    );
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as { items?: Array<{ id: string }> };
    expect(listPayload.items?.some((item) => item.id === payload.customer.id)).toBe(true);
  });

  it('allows clients manager to list customers', async () => {
    const { token } = await createClientsManagerSession();

    const response = await listCustomers(
      new Request('http://localhost/api/admin/customers?page=1&pageSize=5', {
        headers: { cookie: `session=${token}` },
      })
    );

    expect(response.status).toBe(200);
  });

  it('allows clients manager to create a customer', async () => {
    const { token } = await createClientsManagerSession({ phone: '+996700000188' });

    const response = await createCustomer(
      jsonRequest('http://localhost/api/admin/customers', token, {
        name: 'Client Manager Customer',
        phone: '+996700000177',
        address: 'Test address',
        password: 'Password123',
      })
    );

    expect(response.status).toBe(200);

    const payload = (await response.json()) as { customer: { id: string } };
    const patchResponse = await updateCustomer(
      new Request(`http://localhost/api/admin/customers/${payload.customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', cookie: `session=${token}` },
        body: JSON.stringify({ name: 'Updated Name' }),
      }),
      { params: Promise.resolve({ id: payload.customer.id }) }
    );

    expect(patchResponse.status).toBe(200);
  });
});
