import { describe, expect, it, vi } from 'vitest';
import { POST as uploadImage } from '@/app/api/admin/products/upload-image/route';
import { createAdminSession } from './helpers';

vi.mock('@/lib/images/storage', () => ({
  uploadToStorage: vi.fn(async () => 'https://example.com/uploaded.png'),
}));

describe('product image upload', () => {
  it('uploads an image and returns a URL', async () => {
    const { token } = await createAdminSession();

    const formData = new FormData();
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
    formData.append('file', blob, 'sample.png');

    const request = new Request('http://localhost/api/admin/products/upload-image', {
      method: 'POST',
      headers: { cookie: `session=${token}` },
      body: formData,
    });

    const response = await uploadImage(request);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { url: string };
    expect(payload.url).toBe('https://example.com/uploaded.png');
  });
});
