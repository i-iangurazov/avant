import { describe, expect, it } from 'vitest';
import { buildPublicUrl } from '@/lib/images/storage';

describe('buildPublicUrl', () => {
  it('uses r2.dev public base URLs exactly as configured', () => {
    const url = buildPublicUrl('https://example.r2.dev', 'plumbing-bucket', 'products/item.png');
    expect(url).toBe('https://example.r2.dev/products/item.png');
  });

  it('keeps custom domain base URLs without adding bucket', () => {
    const url = buildPublicUrl('https://cdn.example.com/', 'plumbing-bucket', 'products/item.png');
    expect(url).toBe('https://cdn.example.com/products/item.png');
  });

  it('preserves configured public base path prefixes', () => {
    const url = buildPublicUrl('https://cdn.example.com/assets/', 'plumbing-bucket', 'products/item space.png');
    expect(url).toBe('https://cdn.example.com/assets/products/item%20space.png');
  });
});
