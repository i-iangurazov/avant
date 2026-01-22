import { z } from 'zod';
import { prisma, Prisma, Locale, OrderStatus, UserRole } from '@plumbing/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { jsonError, jsonErrorFromZod, jsonOk } from '@/lib/apiResponse';
import { normalizeWhitespace } from '@/lib/importer/normalize';
import { isLanguage } from '@/lib/i18n';
import { buildOrderItems } from '@/lib/orders/adminOrderItems';
import { buildOrderItemsSummary, type OrderLineItem } from '@/lib/notifications/order';

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

const orderSchema = z.object({
  userId: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  status: z.nativeEnum(OrderStatus).optional(),
  locale: z.string().optional(),
});

const parsePageNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const isOrderStatus = (value: string): value is OrderStatus =>
  Object.values(OrderStatus).includes(value as OrderStatus);

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = normalizeWhitespace(url.searchParams.get('q') ?? '');
  const statusParam = url.searchParams.get('status');
  const page = parsePageNumber(url.searchParams.get('page'), 1);
  const pageSize = Math.min(parsePageNumber(url.searchParams.get('pageSize'), 20), 100);

  const status =
    statusParam && statusParam !== 'all'
      ? isOrderStatus(statusParam)
        ? statusParam
        : null
      : undefined;

  if (status === null) {
    return jsonError({ code: 'invalid_status', message: 'Invalid status filter.' }, 400);
  }

  const where: Prisma.StoreOrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { user: { name: { contains: q, mode: Prisma.QueryMode.insensitive } } },
            { user: { phone: { contains: q } } },
          ],
        }
      : {}),
  };

  const [total, orders] = await prisma.$transaction([
    prisma.storeOrder.count({ where }),
    prisma.storeOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: true },
    }),
  ]);

  const items = orders.map((order) => ({
    id: order.id,
    status: order.status,
    total: order.total,
    locale: order.locale,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customer: order.user
      ? {
          id: order.user.id,
          name: order.user.name,
          phone: order.user.phone,
          address: order.user.address,
          isActive: order.user.isActive,
        }
      : null,
    itemsSummary: buildOrderItemsSummary(Array.isArray(order.items) ? (order.items as OrderLineItem[]) : []),
  }));

  return jsonOk({ items, page, pageSize, total });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErrorFromZod(parsed.error);
  }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user || user.role !== UserRole.USER) {
    return jsonError({ code: 'customer_not_found', message: 'Customer not found.' }, 404);
  }

  const locale = isLanguage(parsed.data.locale) ? (parsed.data.locale as Locale) : Locale.ru;

  let orderItems: unknown[] = [];
  let total = 0;

  try {
    const result = await buildOrderItems({ items: parsed.data.items, locale });
    orderItems = result.items;
    total = result.total;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid order items.';
    return jsonError({ code: 'invalid_items', message }, 400);
  }

  const order = await prisma.$transaction((tx) =>
    tx.storeOrder.create({
      data: {
        userId: user.id,
        locale,
        total,
        items: orderItems as Prisma.InputJsonValue,
        status: parsed.data.status ?? OrderStatus.NEW,
      },
    })
  );

  return jsonOk({
    order: {
      id: order.id,
      status: order.status,
      total: order.total,
    },
  });
}
