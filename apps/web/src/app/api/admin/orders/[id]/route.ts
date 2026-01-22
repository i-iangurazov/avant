import { z } from 'zod';
import { prisma, Prisma, Locale, OrderStatus, UserRole } from '@plumbing/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { jsonError, jsonErrorFromZod, jsonOk } from '@/lib/apiResponse';
import { normalizeWhitespace } from '@/lib/importer/normalize';
import { isLanguage } from '@/lib/i18n';
import { buildOrderItems } from '@/lib/orders/adminOrderItems';
import { isValidPhone } from '@/lib/auth/validation';

export const runtime = 'nodejs';

const orderItemSchema = z
  .object({
    variantId: z.string().optional().nullable(),
    productName: z.string().optional().nullable(),
    variantLabel: z.string().optional().nullable(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().int().positive().optional(),
  })
  .refine((item) => Boolean(item.variantId || item.productName), {
    message: 'Item must include variantId or productName.',
  });

const orderUpdateSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  items: z.array(orderItemSchema).optional(),
  locale: z.string().optional(),
  userId: z.string().optional(),
  customer: z
    .object({
      name: z.string().optional().nullable(),
      phone: z.string().optional(),
      address: z.string().optional().nullable(),
    })
    .optional(),
});

const resolveId = async (params: Promise<{ id?: string | string[] }>) => {
  const resolved = await params;
  const value = resolved.id;
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const resolveLocale = (value?: string | null) => {
  if (isLanguage(value)) return value as Locale;
  return null;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id?: string | string[] }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const id = await resolveId(params);
  if (!id) {
    return jsonError({ code: 'invalid_id', message: 'Invalid order id.' }, 400);
  }

  const order = await prisma.storeOrder.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!order) {
    return jsonError({ code: 'not_found', message: 'Order not found.' }, 404);
  }

  return jsonOk({
    order: {
      id: order.id,
      status: order.status,
      total: order.total,
      locale: order.locale,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: Array.isArray(order.items) ? order.items : [],
      customer: order.user
        ? {
            id: order.user.id,
            name: order.user.name,
            phone: order.user.phone,
            address: order.user.address,
            isActive: order.user.isActive,
          }
        : null,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id?: string | string[] }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const id = await resolveId(params);
  if (!id) {
    return jsonError({ code: 'invalid_id', message: 'Invalid order id.' }, 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = orderUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErrorFromZod(parsed.error);
  }

  const existing = await prisma.storeOrder.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!existing) {
    return jsonError({ code: 'not_found', message: 'Order not found.' }, 404);
  }

  const data: Prisma.StoreOrderUpdateInput = {};
  const locale =
    resolveLocale(parsed.data.locale) ?? resolveLocale(existing.locale ?? undefined) ?? Locale.ru;

  if (parsed.data.status) {
    data.status = parsed.data.status;
  }

  let targetUserId = existing.userId ?? undefined;
  let targetUser = existing.user ?? null;
  if (parsed.data.userId) {
    const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!user || user.role !== UserRole.USER) {
      return jsonError({ code: 'customer_not_found', message: 'Customer not found.' }, 404);
    }
    data.user = { connect: { id: user.id } };
    targetUserId = user.id;
    targetUser = user;
  }

  if (parsed.data.items) {
    try {
      const result = await buildOrderItems({ items: parsed.data.items, locale });
      data.items = result.items as Prisma.InputJsonValue;
      data.total = result.total;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid order items.';
      return jsonError({ code: 'invalid_items', message }, 400);
    }
  }

  let customerData: Prisma.UserUpdateInput | null = null;
  if (parsed.data.customer) {
    if (!targetUserId) {
      return jsonError({ code: 'customer_required', message: 'Customer is required for this order.' }, 400);
    }

    customerData = {};

    if (parsed.data.customer.name !== undefined) {
      customerData.name = normalizeWhitespace(parsed.data.customer.name ?? '') || null;
    }

    if (parsed.data.customer.address !== undefined) {
      customerData.address = normalizeWhitespace(parsed.data.customer.address ?? '') || null;
    }

    if (parsed.data.customer.phone !== undefined) {
      const phone = normalizeWhitespace(parsed.data.customer.phone);
      if (!isValidPhone(phone)) {
        return jsonError({ code: 'invalid_phone', message: 'Phone number is invalid.' }, 400);
      }
      if (phone !== targetUser?.phone) {
        const dupe = await prisma.user.findUnique({ where: { phone } });
        if (dupe && dupe.id !== targetUserId) {
          return jsonError({ code: 'phone_exists', message: 'Phone number already exists.' }, 409);
        }
      }
      customerData.phone = phone;
    }
  }

  if (Object.keys(data).length === 0 && !customerData) {
    return jsonOk({});
  }

  await prisma.$transaction(async (tx) => {
    if (customerData && targetUserId) {
      await tx.user.update({ where: { id: targetUserId }, data: customerData });
    }
    if (Object.keys(data).length > 0) {
      await tx.storeOrder.update({ where: { id }, data });
    }
  });

  const updated = await prisma.storeOrder.findUnique({
    where: { id },
    include: { user: true },
  });

  return jsonOk({
    order: updated
      ? {
          id: updated.id,
          status: updated.status,
          total: updated.total,
          locale: updated.locale,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          items: Array.isArray(updated.items) ? updated.items : [],
          customer: updated.user
            ? {
                id: updated.user.id,
                name: updated.user.name,
                phone: updated.user.phone,
                address: updated.user.address,
                isActive: updated.user.isActive,
              }
            : null,
        }
      : null,
  });
}
