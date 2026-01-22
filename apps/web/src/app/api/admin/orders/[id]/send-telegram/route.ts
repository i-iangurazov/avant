import { after } from 'next/server';
import { prisma } from '@plumbing/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { jsonError, jsonOk } from '@/lib/apiResponse';
import { dispatchOrderNotifications, processNotificationJobs } from '@/lib/notifications/jobs';

export const runtime = 'nodejs';

const resolveId = async (params: Promise<{ id?: string | string[] }>) => {
  const resolved = await params;
  const value = resolved.id;
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id?: string | string[] }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const id = await resolveId(params);
  if (!id) {
    return jsonError({ code: 'invalid_id', message: 'Invalid order id.' }, 400);
  }

  const order = await prisma.storeOrder.findUnique({ where: { id } });
  if (!order) {
    return jsonError({ code: 'not_found', message: 'Order not found.' }, 404);
  }

  const result = await dispatchOrderNotifications(order.id);
  try {
    after(() => processNotificationJobs({ orderId: order.id }));
  } catch {
    await processNotificationJobs({ orderId: order.id });
  }

  return jsonOk({ enqueued: result.enqueued });
}
