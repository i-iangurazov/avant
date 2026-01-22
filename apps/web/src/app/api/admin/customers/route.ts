import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma, Prisma, UserRole } from '@plumbing/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { jsonError, jsonErrorFromZod, jsonOk } from '@/lib/apiResponse';
import { isValidPhone } from '@/lib/auth/validation';
import { normalizeWhitespace } from '@/lib/importer/normalize';

export const runtime = 'nodejs';

const customerSchema = z.object({
  name: z.string().optional().nullable(),
  phone: z.string().min(1),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().optional().nullable(),
});

const parsePageNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const generatePassword = () => randomBytes(9).toString('base64url');

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = normalizeWhitespace(url.searchParams.get('q') ?? '');
  const page = parsePageNumber(url.searchParams.get('page'), 1);
  const pageSize = Math.min(parsePageNumber(url.searchParams.get('pageSize'), 20), 100);

  const where: Prisma.UserWhereInput = {
    role: UserRole.USER,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = users.map((user) => ({
    id: user.id,
    name: user.name,
    phone: user.phone,
    address: user.address,
    isActive: user.isActive,
    createdAt: user.createdAt,
  }));

  return jsonOk({ items, page, pageSize, total });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErrorFromZod(parsed.error);
  }

  const phone = normalizeWhitespace(parsed.data.phone);
  if (!isValidPhone(phone)) {
    return jsonError({ code: 'invalid_phone', message: 'Phone number is invalid.' }, 400);
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return jsonError({ code: 'phone_exists', message: 'Phone number already exists.' }, 409);
  }

  const name = normalizeWhitespace(parsed.data.name ?? '') || null;
  const address = normalizeWhitespace(parsed.data.address ?? '') || null;
  const rawPassword = (parsed.data.password ?? '').trim();
  const password = rawPassword || generatePassword();
  if (password.length < 8) {
    return jsonError({ code: 'password_too_short', message: 'Password must be at least 8 characters.' }, 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      address,
      passwordHash,
      role: UserRole.USER,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return jsonOk({
    customer: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      address: user.address,
      isActive: user.isActive,
    },
    ...(rawPassword ? {} : { tempPassword: password }),
  });
}
