import type { NextResponse } from 'next/server';
import { UserRole, type User } from '@plumbing/db';
import { getSessionUser } from './session';
import { jsonError } from '@/lib/apiResponse';

type RequireAdminResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

export const requireRole = async (
  request: Request | undefined,
  allowedRoles: UserRole[]
): Promise<RequireAdminResult> => {
  const user = await getSessionUser(request);
  if (!user) {
    return {
      ok: false,
      response: jsonError({ code: 'unauthorized', message: 'Not authorized.' }, 401),
    };
  }
  if (!allowedRoles.includes(user.role)) {
    return {
      ok: false,
      response: jsonError({ code: 'forbidden', message: 'Access denied.' }, 403),
    };
  }
  return { ok: true, user };
};

export const requireAdmin = (request?: Request) => requireRole(request, [UserRole.ADMIN]);

export const requireCustomersManager = (request?: Request) =>
  requireRole(request, [UserRole.ADMIN, UserRole.CLIENTS_MANAGER]);
