import * as XLSX from 'xlsx';
import { normalizeWhitespace, safeString } from '@/lib/importer/normalize';

export type TaxonomyCategory = {
  name: string;
  sortOrder: number;
  subcategories: Array<{ name: string; sortOrder: number }>;
};

export type TaxonomyParseResult = {
  categories: TaxonomyCategory[];
  warnings: string[];
  errors: string[];
};

const isEmptyRow = (row: string[]) => row.every((cell) => !cell);

const normalizeCell = (value: unknown) => safeString(value);

const normalizeHeader = (value: string) => normalizeWhitespace(value).toLowerCase();

const isDescriptionLike = (value: string) => {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return false;
  const words = normalized.split(' ').filter(Boolean);
  if (normalized.length >= 80) return true;
  if (words.length >= 12) return true;
  if (/[.!?]/.test(normalized) && words.length >= 6) return true;
  if (/,/.test(normalized) && words.length >= 8) return true;
  return false;
};

const shouldIncludeSubcategory = (value: string) => Boolean(value) && !isDescriptionLike(value);

const detectListHeader = (row: string[]) => {
  if (row.length < 2) return false;
  const left = normalizeHeader(row[0] ?? '');
  const right = normalizeHeader(row[1] ?? '');
  const leftMatch = left.includes('category') || left.includes('катег');
  const rightMatch = right.includes('subcategory') || right.includes('подкат');
  return leftMatch && rightMatch;
};

const pickHeaderRowIndex = (rows: string[][]) => {
  if (rows.length >= 3 && rows[2].some((cell) => cell)) return 2;
  let bestIndex = 0;
  let bestCount = 0;
  const limit = Math.min(rows.length, 10);
  for (let i = 0; i < limit; i += 1) {
    const count = rows[i].filter(Boolean).length;
    if (count > bestCount) {
      bestCount = count;
      bestIndex = i;
    }
  }
  return bestIndex;
};

const buildFromListRows = (rows: string[][], headerIndex: number): TaxonomyCategory[] => {
  const categoryMap = new Map<string, { name: string; sortOrder: number; subcategories: string[] }>();
  let order = 0;

  rows.slice(headerIndex + 1).forEach((row) => {
    const category = row[0] ?? '';
    const subcategory = row[1] ?? '';
    if (!category) return;
    let entry = categoryMap.get(category);
    if (!entry) {
      entry = { name: category, sortOrder: order, subcategories: [] };
      categoryMap.set(category, entry);
      order += 1;
    }
    if (shouldIncludeSubcategory(subcategory) && !entry.subcategories.includes(subcategory)) {
      entry.subcategories.push(subcategory);
    }
  });

  return Array.from(categoryMap.values()).map((category) => ({
    name: category.name,
    sortOrder: category.sortOrder,
    subcategories: category.subcategories.map((name, idx) => ({ name, sortOrder: idx })),
  }));
};

const buildFromColumns = (rows: string[][], headerIndex: number): TaxonomyCategory[] => {
  const headerRow = rows[headerIndex] ?? [];
  const categories: TaxonomyCategory[] = [];

  headerRow.forEach((rawName, columnIdx) => {
    const name = rawName ?? '';
    if (!name) return;
    const subcategories: Array<{ name: string; sortOrder: number }> = [];
    rows.slice(headerIndex + 1).forEach((row) => {
      const cell = row[columnIdx] ?? '';
      if (!cell) return;
      if (!shouldIncludeSubcategory(cell)) return;
      if (subcategories.some((entry) => entry.name === cell)) return;
      subcategories.push({ name: cell, sortOrder: subcategories.length });
    });
    categories.push({
      name,
      sortOrder: categories.length,
      subcategories,
    });
  });

  return categories;
};

export const parseTaxonomyRows = (rows: string[][]): TaxonomyParseResult => {
  const warnings: string[] = [];
  const errors: string[] = [];

  const normalizedRows = rows
    .map((row) => row.map(normalizeCell))
    .filter((row) => row.length && !isEmptyRow(row));

  if (!normalizedRows.length) {
    return { categories: [], warnings: ['No rows found in taxonomy file.'], errors };
  }

  const listHeaderIndex = normalizedRows.findIndex(detectListHeader);
  let categories: TaxonomyCategory[] = [];

  if (listHeaderIndex >= 0) {
    categories = buildFromListRows(normalizedRows, listHeaderIndex);
  } else {
    const headerIndex = pickHeaderRowIndex(normalizedRows);
    categories = buildFromColumns(normalizedRows, headerIndex);
  }

  if (!categories.length) {
    warnings.push('No categories detected in taxonomy file.');
  }

  return { categories, warnings, errors };
};

export const parseTaxonomyCsv = (content: string): TaxonomyParseResult => {
  const sanitized = content.replace(/^\uFEFF/, '');
  const delimiter = (() => {
    const sampleLine = sanitized.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
    const commas = (sampleLine.match(/,/g) ?? []).length;
    const semicolons = (sampleLine.match(/;/g) ?? []).length;
    return commas >= semicolons ? ',' : ';';
  })();

  const parseLine = (line: string) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let idx = 0; idx < line.length; idx += 1) {
      const char = line[idx];
      if (char === '"') {
        const next = line[idx + 1];
        if (inQuotes && next === '"') {
          current += '"';
          idx += 1;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }
      if (char === delimiter && !inQuotes) {
        cells.push(normalizeCell(current));
        current = '';
        continue;
      }
      current += char;
    }
    cells.push(normalizeCell(current));
    return cells;
  };

  const rows = sanitized
    .split(/\r?\n/)
    .map(parseLine)
    .filter((row) => row.length && !isEmptyRow(row));

  return parseTaxonomyRows(rows);
};

export const parseTaxonomyWorkbook = (buffer: Buffer): TaxonomyParseResult => {
  const warnings: string[] = [];
  const errors: string[] = [];

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch (error) {
    console.error(error);
    return { categories: [], warnings, errors: ['Failed to parse taxonomy file.'] };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { categories: [], warnings, errors: ['Taxonomy file has no sheets.'] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
  const rows = rawRows.map((row) => row.map(normalizeCell));
  const parsed = parseTaxonomyRows(rows);
  return {
    categories: parsed.categories,
    warnings: [...warnings, ...parsed.warnings],
    errors: [...errors, ...parsed.errors],
  };
};
