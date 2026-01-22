import type { NextResponse } from 'next/server';
import { UserRole, type User } from '@plumbing/db';
import { getSessionUser } from './session';
import { jsonError } from '@/lib/apiResponse';

type RequireAdminResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

export const requireAdmin = async (request?: Request): Promise<RequireAdminResult> => {
  const user = await getSessionUser(request);
  if (!user) {
    return {
      ok: false,
      response: jsonError({ code: 'unauthorized', message: 'Not authorized.' }, 401),
    };
  }
  if (user.role !== UserRole.ADMIN) {
    return {
      ok: false,
      response: jsonError({ code: 'forbidden', message: 'Access denied.' }, 403),
    };
  }
  return { ok: true, user };
};
