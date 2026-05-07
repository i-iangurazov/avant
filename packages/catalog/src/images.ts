const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export const normalizeCatalogImageUrl = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed || CONTROL_CHARACTERS.test(trimmed)) return null;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.hostname) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
};

export const isCatalogImageUrl = (value: string | null | undefined) =>
  normalizeCatalogImageUrl(value) !== null;
