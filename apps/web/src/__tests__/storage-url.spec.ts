import { describe, expect, it } from 'vitest';
import { buildPublicUrl } from '@/lib/images/storage';

describe('buildPublicUrl', () => {
  it('includes bucket for r2.dev base URLs', () => {
    const url = buildPublicUrl('https://example.r2.dev', 'plumbing-bucket', 'products/item.png');
    expect(url).toBe('https://example.r2.dev/plumbing-bucket/products/item.png');
  });

  it('keeps custom domain base URLs without bucket', () => {
    const url = buildPublicUrl('https://cdn.example.com/', 'plumbing-bucket', 'products/item.png');
    expect(url).toBe('https://cdn.example.com/products/item.png');
  });
});
