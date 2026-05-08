const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

const safeDecodePathSegment = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const pathSegments = (pathname: string) =>
  pathname.split('/').filter(Boolean).map(safeDecodePathSegment);

const hasPathPrefix = (segments: string[], prefix: string[]) =>
  prefix.length === 0 || prefix.every((segment, index) => segments[index] === segment);

const setUrlPathSegments = (url: URL, segments: string[]) => {
  url.pathname = `/${segments.map(encodeURIComponent).join('/')}`;
};

const isR2PublicHostname = (hostname: string) => hostname.endsWith('.r2.dev');

const requiredStoragePathPrefix = (publicBaseUrl: URL, bucket: string | null | undefined) => {
  const configuredSegments = pathSegments(publicBaseUrl.pathname);
  if (configuredSegments.length > 0) return configuredSegments;
  if (bucket && isR2PublicHostname(publicBaseUrl.hostname)) return [bucket];
  return [];
};

export const buildStoragePublicUrl = (publicBase: string, bucket: string, key: string) => {
  const url = new URL(publicBase.trim());
  const prefix = requiredStoragePathPrefix(url, bucket);
  const keySegments = pathSegments(`/${key.trim().replace(/^\/+/, '')}`);
  setUrlPathSegments(url, [...prefix, ...keySegments]);
  return url.toString();
};

const normalizeConfiguredStorageUrl = (url: URL) => {
  const publicBase = typeof process === 'undefined' ? undefined : process.env.S3_PUBLIC_BASE_URL;
  const bucket = typeof process === 'undefined' ? undefined : process.env.S3_BUCKET;
  if (!publicBase) return url;

  try {
    const configuredBase = new URL(publicBase.trim());
    if (configuredBase.origin !== url.origin) return url;

    const prefix = requiredStoragePathPrefix(configuredBase, bucket);
    if (prefix.length === 0) return url;

    const currentSegments = pathSegments(url.pathname);
    if (hasPathPrefix(currentSegments, prefix)) return url;

    const nextUrl = new URL(url.toString());
    setUrlPathSegments(nextUrl, [...prefix, ...currentSegments]);
    return nextUrl;
  } catch {
    return url;
  }
};

export const normalizeCatalogImageUrl = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed || CONTROL_CHARACTERS.test(trimmed)) return null;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.hostname) {
      return normalizeConfiguredStorageUrl(url).toString();
    }
  } catch {
    return null;
  }

  return null;
};

export const isCatalogImageUrl = (value: string | null | undefined) =>
  normalizeCatalogImageUrl(value) !== null;
