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

  it('rejects malformed or unsafe values', () => {
    expect(normalizeCatalogImageUrl('$2b')).toBeNull();
    expect(normalizeCatalogImageUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeCatalogImageUrl('//example.com/image.png')).toBeNull();
    expect(normalizeCatalogImageUrl('')).toBeNull();
    expect(normalizeCatalogImageUrl('   ')).toBeNull();
  });
});
