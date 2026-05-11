import { describe, expect, it } from 'vitest';
import { normalizeCatalogImageUrl } from '@plumbing/catalog/images';

describe('normalizeCatalogImageUrl', () => {
  it('keeps absolute http and https image URLs', () => {
    expect(normalizeCatalogImageUrl(' https://example.com/products/item.png ')).toBe(
      'https://example.com/products/item.png'
    );
    expect(normalizeCatalogImageUrl('http://localhost:3000/item.webp')).toBe(
      'http://localhost:3000/item.webp'
    );
  });

  it('keeps root-relative image paths', () => {
    expect(normalizeCatalogImageUrl('/avantech/pipe.svg')).toBe('/avantech/pipe.svg');
  });

  it('keeps image data URLs and normalizes protocol-relative links', () => {
    expect(normalizeCatalogImageUrl('data:image/png;base64,aGVsbG8=')).toBe(
      'data:image/png;base64,aGVsbG8='
    );
    expect(normalizeCatalogImageUrl('//cdn.example.com/products/item.png')).toBe(
      'https://cdn.example.com/products/item.png'
    );
  });

  it('repairs stored r2.dev URLs that are missing the configured bucket path', () => {
    const previousBase = process.env.S3_PUBLIC_BASE_URL;
    const previousBucket = process.env.S3_BUCKET;
    process.env.S3_PUBLIC_BASE_URL = 'https://example.r2.dev';
    process.env.S3_BUCKET = 'plumbing-images';

    try {
      expect(normalizeCatalogImageUrl('https://example.r2.dev/products/item.png')).toBe(
        'https://example.r2.dev/plumbing-images/products/item.png'
      );
      expect(normalizeCatalogImageUrl('https://example.r2.dev/plumbing-images/products/item.png')).toBe(
        'https://example.r2.dev/plumbing-images/products/item.png'
      );
    } finally {
      if (previousBase === undefined) {
        delete process.env.S3_PUBLIC_BASE_URL;
      } else {
        process.env.S3_PUBLIC_BASE_URL = previousBase;
      }
      if (previousBucket === undefined) {
        delete process.env.S3_BUCKET;
      } else {
        process.env.S3_BUCKET = previousBucket;
      }
    }
  });

  it('rejects malformed or unsafe values', () => {
    expect(normalizeCatalogImageUrl('$2b')).toBeNull();
    expect(normalizeCatalogImageUrl('data:text/html;base64,PHNjcmlwdD4=')).toBeNull();
    expect(normalizeCatalogImageUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeCatalogImageUrl('')).toBeNull();
    expect(normalizeCatalogImageUrl('   ')).toBeNull();
  });
});
