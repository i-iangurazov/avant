const normalizeLocale = (locale: string) => (locale === 'kg' ? 'ky' : locale);

const capitalize = (value: string, locale: string) => {
  if (!value) return value;
  return value.charAt(0).toLocaleUpperCase(locale) + value.slice(1);
};

export const formatDisplayTitle = (value: string, locale: string) => {
  const trimmed = value.trim();
  if (!trimmed) return value;

  const casingLocale = normalizeLocale(locale);
  const lower = trimmed.toLocaleLowerCase(casingLocale);
  const upper = trimmed.toLocaleUpperCase(casingLocale);
  const hasLower = trimmed !== upper;
  const hasUpper = trimmed !== lower;
  const isMixed = hasLower && hasUpper;

  if (isMixed) return trimmed;
  if (trimmed === lower) return capitalize(lower, casingLocale);

  if (trimmed === upper) {
    const words = trimmed.split(/\s+/);
    const normalized = words.map((word) => {
      const isAcronym = word.length <= 4;
      return isAcronym ? word : word.toLocaleLowerCase(casingLocale);
    });
    const first = normalized[0];
    if (first && first.length > 4) {
      normalized[0] = capitalize(first, casingLocale);
    }
    return normalized.join(' ');
  }

  return trimmed;
};
