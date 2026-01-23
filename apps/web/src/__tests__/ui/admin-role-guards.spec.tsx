// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@plumbing/db';
import CustomersAdmin from '@/components/admin/CustomersAdmin';
import AdminForbidden from '@/components/admin/AdminForbidden';
import CustomersPage from '@/app/admin/customers/page';
import ProductsPage from '@/app/admin/products/page';
import { getSessionUser } from '@/lib/auth/session';

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: vi.fn(),
}));

const getSessionUserMock = vi.mocked(getSessionUser);

describe('admin role guards', () => {
  afterEach(() => {
    getSessionUserMock.mockReset();
  });

  it('allows clients manager on /admin/customers', async () => {
    getSessionUserMock.mockResolvedValue({ role: UserRole.CLIENTS_MANAGER } as never);
    const element = await CustomersPage();
    expect(element.type).toBe(CustomersAdmin);
  });

  it('blocks clients manager on /admin/products', async () => {
    getSessionUserMock.mockResolvedValue({ role: UserRole.CLIENTS_MANAGER } as never);
    const element = await ProductsPage();
    expect(element.type).toBe(AdminForbidden);
  });
});
