import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma, Prisma, UserRole } from '@plumbing/db';
import { requireCustomersManager } from '@/lib/auth/requireAdmin';
import { jsonError, jsonErrorFromZod, jsonOk } from '@/lib/apiResponse';
import { isValidPhone } from '@/lib/auth/validation';
import { normalizeWhitespace } from '@/lib/importer/normalize';

export const runtime = 'nodejs';

const customerUpdateSchema = z.object({
  name: z.string().optional().nullable(),
  phone: z.string().optional(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().optional().nullable(),
});

const resolveId = async (params: Promise<{ id?: string | string[] }>) => {
  const resolved = await params;
  const value = resolved.id;
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id?: string | string[] }> }
) {
  const auth = await requireCustomersManager(request);
  if (!auth.ok) return auth.response;

  const id = await resolveId(params);
  if (!id) {
    return jsonError({ code: 'invalid_id', message: 'Invalid customer id.' }, 400);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== UserRole.USER) {
    return jsonError({ code: 'not_found', message: 'Customer not found.' }, 404);
  }

  return jsonOk({
    customer: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      address: user.address,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id?: string | string[] }> }
) {
  const auth = await requireCustomersManager(request);
  if (!auth.ok) return auth.response;

  const id = await resolveId(params);
  if (!id) {
    return jsonError({ code: 'invalid_id', message: 'Invalid customer id.' }, 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = customerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErrorFromZod(parsed.error);
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.role !== UserRole.USER) {
    return jsonError({ code: 'not_found', message: 'Customer not found.' }, 404);
  }

  const data: Prisma.UserUpdateInput = {};

  if (parsed.data.name !== undefined) {
    data.name = normalizeWhitespace(parsed.data.name ?? '') || null;
  }

  if (parsed.data.address !== undefined) {
    data.address = normalizeWhitespace(parsed.data.address ?? '') || null;
  }

  if (parsed.data.isActive !== undefined) {
    data.isActive = parsed.data.isActive;
  }

  if (parsed.data.phone !== undefined) {
    const phone = normalizeWhitespace(parsed.data.phone);
    if (!isValidPhone(phone)) {
      return jsonError({ code: 'invalid_phone', message: 'Phone number is invalid.' }, 400);
    }
    if (phone !== existing.phone) {
      const dupe = await prisma.user.findUnique({ where: { phone } });
      if (dupe) {
        return jsonError({ code: 'phone_exists', message: 'Phone number already exists.' }, 409);
      }
      data.phone = phone;
    }
  }

  if (parsed.data.password !== undefined) {
    const rawPassword = (parsed.data.password ?? '').trim();
    if (rawPassword) {
      if (rawPassword.length < 8) {
        return jsonError({ code: 'password_too_short', message: 'Password must be at least 8 characters.' }, 400);
      }
      data.passwordHash = await bcrypt.hash(rawPassword, 10);
    }
  }

  if (Object.keys(data).length === 0) {
    return jsonOk({
      customer: {
        id: existing.id,
        name: existing.name,
        phone: existing.phone,
        address: existing.address,
        isActive: existing.isActive,
        createdAt: existing.createdAt,
      },
    });
  }

  const user = await prisma.user.update({ where: { id }, data });

  return jsonOk({
    customer: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      address: user.address,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id?: string | string[] }> }
) {
  const auth = await requireCustomersManager(request);
  if (!auth.ok) return auth.response;

  const id = await resolveId(params);
  if (!id) {
    return jsonError({ code: 'invalid_id', message: 'Invalid customer id.' }, 400);
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.role !== UserRole.USER) {
    return jsonError({ code: 'not_found', message: 'Customer not found.' }, 404);
  }

  const ordersCount = await prisma.storeOrder.count({ where: { userId: id } });
  if (ordersCount > 0) {
    return jsonError(
      { code: 'customer_has_orders', message: 'Нельзя удалить клиента с заказами.' },
      409
    );
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return jsonOk({ customerId: id });
}
