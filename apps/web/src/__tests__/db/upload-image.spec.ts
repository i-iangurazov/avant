import { describe, expect, it, vi } from 'vitest';
import { POST as uploadImage } from '@/app/api/admin/products/upload-image/route';
import { createAdminSession } from './helpers';

vi.mock('@/lib/images/storage', () => ({
  uploadToStorage: vi.fn(async ({ key }: { key: string }) => `https://example.com/${key}`),
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
    expect(payload.url).toMatch(/^https:\/\/example\.com\/products\/.+\.png$/);
  });

  it('uploads image files larger than the previous 5 MB application cap', async () => {
    const { token } = await createAdminSession();

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' });
    formData.append('file', blob, 'large.png');

    const request = new Request('http://localhost/api/admin/products/upload-image', {
      method: 'POST',
      headers: { cookie: `session=${token}` },
      body: formData,
    });

    const response = await uploadImage(request);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { url: string };
    expect(payload.url).toMatch(/^https:\/\/example\.com\/products\/.+\.png$/);
  });

  it('uploads image data URLs', async () => {
    const { token } = await createAdminSession();

    const formData = new FormData();
    formData.append('imageUrl', `data:image/gif;base64,${Buffer.from('GIF89a', 'ascii').toString('base64')}`);

    const request = new Request('http://localhost/api/admin/products/upload-image', {
      method: 'POST',
      headers: { cookie: `session=${token}` },
      body: formData,
    });

    const response = await uploadImage(request);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { url: string };
    expect(payload.url).toMatch(/^https:\/\/example\.com\/products\/.+\.gif$/);
  });

  it('uploads additional browser-supported image types', async () => {
    const { token } = await createAdminSession();

    const formData = new FormData();
    const svg = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" />'], {
      type: 'image/svg+xml',
    });
    formData.append('file', svg, 'sample.svg');

    const request = new Request('http://localhost/api/admin/products/upload-image', {
      method: 'POST',
      headers: { cookie: `session=${token}` },
      body: formData,
    });

    const response = await uploadImage(request);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { url: string };
    expect(payload.url).toMatch(/^https:\/\/example\.com\/products\/.+\.svg$/);
  });
});
