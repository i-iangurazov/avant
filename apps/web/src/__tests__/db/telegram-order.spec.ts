import { describe, expect, it, vi } from 'vitest';
import { POST as submitOrder } from '@/app/api/telegram-order/route';
import { processNotificationJobs } from '@/lib/notifications/jobs';
import { createCategory, createProduct, createVariant } from './helpers';

const sendTelegramMessageMock = vi.hoisted(() =>
  vi.fn(async () => ({ messageId: 'msg-1', responseJson: { ok: true } }))
);

vi.mock('@/lib/notifications/telegram', () => ({
  sendTelegramMessage: sendTelegramMessageMock,
}));

describe('telegram order route', () => {
  it('submits an order and dispatches telegram notifications', async () => {
    const category = await createCategory({ name: 'Трубы' });
    const product = await createProduct({ categoryId: category.id, name: 'Pipe 20mm' });
    const variant = await createVariant({ productId: product.id, label: '20 мм', price: 120 });

    const response = await submitOrder(
      new Request('http://localhost/api/telegram-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: 'en',
          items: [{ variantId: variant.id, quantity: 2 }],
        }),
      })
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok?: boolean; orderId?: string };
    expect(payload.ok).toBe(true);
    expect(payload.orderId).toBeTruthy();

    await processNotificationJobs({ orderId: payload.orderId });
    expect(sendTelegramMessageMock).toHaveBeenCalled();
  });
});
