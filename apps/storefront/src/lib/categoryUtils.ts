/**
 * Formats a category name in Title Case for display.
 *
 * Applied at the render layer only — the underlying data is never mutated.
 *
 * Russian conjunctions and prepositions ("и", "или", "для", "в", etc.) stay
 * lowercase when they appear mid-string, matching standard Russian title-case
 * conventions. The very first word is always capitalised regardless.
 *
 * Examples:
 *   "КРАНЫ И ВЕНТИЛИ"         → "Краны и Вентили"
 *   "СИФОНЫ И КОМПЛЕКТУЮЩИЕ"  → "Сифоны и Комплектующие"
 *   "СИДЕНЬЯ ДЛЯ УНИТАЗА"     → "Сиденья для Унитаза"
 *   "ELECTRONICS"             → "Electronics"
 *   "home & garden"           → "Home & Garden"
 */

/** Russian conjunctions and prepositions that stay lowercase mid-title. */
const RU_LOWERCASE = new Set([
  'и', 'или', 'а', 'но', 'да', 'ни', 'же',
  'в', 'во', 'на', 'с', 'со', 'к', 'ко',
  'от', 'до', 'за', 'по', 'при', 'из', 'об', 'о', 'не',
  'для', 'под', 'над', 'без', 'через', 'между', 'про',
]);

export function capitalizeCategory(str: string): string {
  // Split on whitespace, preserving the separators so we can rejoin exactly.
  const tokens = str.toLowerCase().split(/(\s+)/);
  let wordIndex = 0;

  return tokens
    .map((token) => {
      // Whitespace-only segment — pass through unchanged.
      if (/^\s*$/.test(token)) return token;

      const isFirst = wordIndex === 0;
      wordIndex++;

      // First word is always capitalised; mid-string small words stay lower.
      if (isFirst || !RU_LOWERCASE.has(token)) {
        return token.charAt(0).toUpperCase() + token.slice(1);
      }
      return token;
    })
    .join('');
}
