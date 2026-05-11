import { randomUUID } from 'crypto';
import { normalizeCatalogImageUrl } from '@plumbing/catalog/images';
import { uploadToStorage } from './storage';

const IMAGE_TYPE_PATTERN = /^image\/[a-z0-9.+-]+$/i;

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/tiff': 'tif',
  'image/vnd.microsoft.icon': 'ico',
  'image/webp': 'webp',
  'image/x-icon': 'ico',
};

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  ico: 'image/x-icon',
  jfif: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  webp: 'image/webp',
};

export class ProductImageSourceError extends Error {
  constructor(message = 'Некорректный URL изображения.') {
    super(message);
    this.name = 'ProductImageSourceError';
  }
}

export const normalizeImageContentType = (value: string | null | undefined) => {
  const contentType = value?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  return IMAGE_TYPE_PATTERN.test(contentType) ? contentType : null;
};

export const isSupportedImageContentType = (value: string | null | undefined) =>
  normalizeImageContentType(value) !== null;

const extensionFromContentType = (contentType: string) => {
  const normalized = normalizeImageContentType(contentType);
  if (!normalized) return null;

  const knownExtension = CONTENT_TYPE_EXTENSIONS[normalized];
  if (knownExtension) return knownExtension;

  const subtype = normalized
    .slice('image/'.length)
    .replace(/^x-/, '')
    .replace(/\+xml$/, '')
    .replace(/[^a-z0-9]/g, '');

  return subtype || null;
};

const contentTypeFromFileName = (fileName: string | null | undefined) => {
  const extension = fileName?.split('.').pop()?.trim().toLowerCase();
  return extension ? EXTENSION_CONTENT_TYPES[extension] ?? null : null;
};

const detectImageContentType = (buffer: Buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.length >= 6) {
    const signature = buffer.subarray(0, 6).toString('ascii');
    if (signature === 'GIF87a' || signature === 'GIF89a') return 'image/gif';
  }
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
    if (brand === 'heic' || brand === 'heix' || brand === 'hevc' || brand === 'hevx') return 'image/heic';
    if (brand === 'mif1' || brand === 'msf1') return 'image/heif';
  }
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'image/bmp';
  }
  if (buffer.length >= 4 && buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
    return 'image/x-icon';
  }
  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
      (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a))
  ) {
    return 'image/tiff';
  }

  const textPrefix = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf8').trimStart();
  if (textPrefix.startsWith('<svg') || (textPrefix.startsWith('<?xml') && textPrefix.includes('<svg'))) {
    return 'image/svg+xml';
  }

  return null;
};

export const resolveUploadedImageContentType = (params: {
  body: Buffer;
  declaredType?: string | null;
  fileName?: string | null;
}) => {
  return (
    detectImageContentType(params.body) ??
    normalizeImageContentType(params.declaredType) ??
    contentTypeFromFileName(params.fileName)
  );
};

const parseImageDataUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed.toLowerCase().startsWith('data:')) return null;

  const commaIndex = trimmed.indexOf(',');
  if (commaIndex <= 0 || commaIndex === trimmed.length - 1) {
    throw new ProductImageSourceError();
  }

  const metadata = trimmed.slice('data:'.length, commaIndex);
  const data = trimmed.slice(commaIndex + 1);
  const metadataParts = metadata.split(';').map((part) => part.trim()).filter(Boolean);
  const mediaType = normalizeImageContentType(metadataParts[0] ?? '');
  const isBase64 = metadataParts.slice(1).some((part) => part.toLowerCase() === 'base64');

  if (!mediaType) {
    throw new ProductImageSourceError('Поддерживаются только изображения.');
  }

  if (isBase64) {
    const compactData = data.replace(/\s/g, '');
    if (!compactData || compactData.length % 4 === 1 || !/^[a-z0-9+/]*={0,2}$/i.test(compactData)) {
      throw new ProductImageSourceError();
    }

    const body = Buffer.from(compactData, 'base64');
    if (body.length === 0) throw new ProductImageSourceError();
    return { body, contentType: mediaType };
  }

  try {
    const body = Buffer.from(decodeURIComponent(data), 'utf8');
    if (body.length === 0) throw new ProductImageSourceError();
    return { body, contentType: mediaType };
  } catch (error) {
    if (error instanceof ProductImageSourceError) throw error;
    throw new ProductImageSourceError();
  }
};

export const uploadProductImageBuffer = async (params: { body: Buffer; contentType: string }) => {
  const contentType = normalizeImageContentType(params.contentType);
  if (!contentType || params.body.length === 0) {
    throw new ProductImageSourceError('Поддерживаются только изображения.');
  }

  const extension = extensionFromContentType(contentType);
  if (!extension) {
    throw new ProductImageSourceError('Поддерживаются только изображения.');
  }

  const key = `products/${Date.now()}-${randomUUID()}.${extension}`;
  const url = await uploadToStorage({ key, body: params.body, contentType });
  const imageUrl = normalizeCatalogImageUrl(url);
  if (!imageUrl) {
    throw new Error('Storage returned an invalid public image URL.');
  }

  return imageUrl;
};

export const resolveProductImageUrl = async (value: string | null | undefined) => {
  const rawImageUrl = value?.trim() ?? '';
  if (!rawImageUrl) return null;

  if (rawImageUrl.toLowerCase().startsWith('data:')) {
    const parsed = parseImageDataUrl(rawImageUrl);
    if (!parsed) throw new ProductImageSourceError();
    return uploadProductImageBuffer(parsed);
  }

  return normalizeCatalogImageUrl(rawImageUrl);
};
