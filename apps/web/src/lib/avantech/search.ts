const normalizeSearchValue = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\u2019']/g, '')
    .replace(/"/g, '')
    .replace(/\u0445/g, 'x')
    .replace(/\u00d7/g, 'x')
    .replace(/\u00a0/g, ' ')
    .trim();

const baseTokenRegex = /(?:\d+\/\d+|[\p{L}\p{N}]+)/gu;
const splitAlphaNumRegex = /\d+|[\p{L}]+/gu;
const hasLetterRegex = /[\p{L}]/u;
const hasNumberRegex = /[\p{N}]/u;
const splitWhitespaceRegex = /\s+/;

const extractBaseTokens = (value: string) => value.match(baseTokenRegex) ?? [];

const expandToken = (token: string) => {
  const parts = token.match(splitAlphaNumRegex) ?? [];
  return parts.length > 1 ? [token, ...parts] : [token];
};

const collectUnitTokens = (value: string) => {
  const tokens: string[] = [];
  const unitRegex = /(\d+(?:[.,]\d+)?)\s*([\p{L}]{1,6})/gu;

  for (const match of value.matchAll(unitRegex)) {
    const number = match[1]?.replace(',', '.') ?? '';
    const unit = match[2] ?? '';
    if (number && unit) tokens.push(`${number}${unit}`);
  }

  return tokens;
};

const collectDimensionTokens = (value: string) => {
  const tokens: string[] = [];
  const dimensionRegex =
    /(\d+(?:[.,]\d+)?)(?:\s*([\p{L}]{1,6}))?\s*x\s*(\d+(?:[.,]\d+)?)(?:\s*([\p{L}]{1,6}))?/gu;

  for (const match of value.matchAll(dimensionRegex)) {
    const first = match[1]?.replace(',', '.') ?? '';
    const firstUnit = match[2] ?? '';
    const second = match[3]?.replace(',', '.') ?? '';
    const secondUnit = match[4] ?? '';

    if (!first || !second) continue;
    tokens.push(`${first}x${second}`);
    if (firstUnit || secondUnit) {
      tokens.push(`${first}${firstUnit}x${second}${secondUnit}`);
    }
  }

  return tokens;
};

const extractEntryTokens = (value: string) => {
  const normalized = normalizeSearchValue(value);
  if (!normalized) return [] as string[];

  const tokens = new Set<string>();
  const baseTokens = extractBaseTokens(normalized);

  baseTokens.forEach((token) => {
    expandToken(token).forEach((expanded) => tokens.add(expanded));
  });

  collectUnitTokens(normalized).forEach((token) => tokens.add(token));
  collectDimensionTokens(normalized).forEach((token) => tokens.add(token));

  return Array.from(tokens);
};

export const buildSearchText = (
  parts: Array<string | number | null | undefined>,
  attributes?: Record<string, string | number>
) => {
  const tokens = new Set<string>();

  parts.forEach((part) => {
    if (part === null || part === undefined) return;
    extractEntryTokens(String(part)).forEach((token) => tokens.add(token));
  });

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      extractEntryTokens(key).forEach((token) => tokens.add(token));
      extractEntryTokens(String(value)).forEach((token) => tokens.add(token));
    });
  }

  if (tokens.size === 0) return '';
  return ` ${Array.from(tokens).join(' ')} `;
};

const tokenizeSearchText = (searchText: string) =>
  searchText
    .trim()
    .split(splitWhitespaceRegex)
    .filter(Boolean);

const matchesTokenExact = (searchTokens: string[], token: string) => searchTokens.includes(token);

const matchesTokenPrefix = (searchTokens: string[], token: string) =>
  searchTokens.some((searchToken) => searchToken.startsWith(token));

const matchesQueryToken = (searchTokens: string[], token: string, allowPrefix: boolean) => {
  if (!token) return true;
  const matchToken = allowPrefix ? matchesTokenPrefix : matchesTokenExact;

  if (token.includes('/')) {
    return matchToken(searchTokens, token);
  }

  const hasLetters = hasLetterRegex.test(token);
  const hasNumbers = hasNumberRegex.test(token);

  if (hasLetters && hasNumbers) {
    if (matchToken(searchTokens, token)) return true;
    const parts = token.match(splitAlphaNumRegex) ?? [token];
    const filtered = parts.filter((part) => part.length > 1 || /\d/.test(part));
    if (filtered.length === 0) return matchToken(searchTokens, token);
    return filtered.every((part) => matchToken(searchTokens, part));
  }

  return matchToken(searchTokens, token);
};

const matchesSearchTextInternal = (searchText: string, query: string, allowPrefix: boolean) => {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return false;
  const tokens = extractBaseTokens(normalizedQuery);
  if (tokens.length === 0) return false;
  const searchTokens = tokenizeSearchText(searchText);
  if (searchTokens.length === 0) return false;
  return tokens.every((token) => matchesQueryToken(searchTokens, token, allowPrefix));
};

export const matchesSearchText = (searchText: string, query: string) =>
  matchesSearchTextInternal(searchText, query, false);

export const matchesSearchTextPrefix = (searchText: string, query: string) =>
  matchesSearchTextInternal(searchText, query, true);
