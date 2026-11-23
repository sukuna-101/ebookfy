const CHUNK_RE = /(\d+(?:\.\d+)?)|(\D+)/g;

/**
 * Splits a string into alternating text and numeric tokens for natural collation.
 * Handles leading zeros ("001" vs "0001"), decimals ("12.5"), and accents.
 */
export function tokenizeNatural(input: string): Array<string | number> {
  const tokens: Array<string | number> = [];
  const normalized = input.trim();
  let match: RegExpExecArray | null;
  CHUNK_RE.lastIndex = 0;
  while ((match = CHUNK_RE.exec(normalized)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(Number(match[1]));
    } else if (match[2] !== undefined) {
      tokens.push(match[2].toLocaleLowerCase('pt-BR'));
    }
  }
  return tokens;
}

/**
 * Compares two filenames or chapter names in natural human order:
 * 1.jpg < 2.jpg < 10.jpg, page_001 < page_002 < page_010, Cap 1 < Cap 2 < Cap 10.
 */
export function compareNatural(a: string, b: string): number {
  const specialWeight = (s: string): number => {
    const low = s.toLocaleLowerCase('pt-BR');
    if (/\b(pr[oó]logo|prologue|intro|capa|cover)\b/.test(low)) return -1;
    if (/\b(ep[ií]logo|epilogue|extra|b[oô]nus|posf[aá]cio)\b/.test(low)) return 1;
    return 0;
  };

  const wa = specialWeight(a);
  const wb = specialWeight(b);
  if (wa !== wb && (wa === -1 || wb === -1 || wa === 1 || wb === 1)) {
    // Only apply prologue/epilogue priority if both aren't numbered chapters
    const numA = extractChapterNumber(a);
    const numB = extractChapterNumber(b);
    if (numA === null || numB === null) {
      return wa - wb;
    }
  }

  const ta = tokenizeNatural(a);
  const tb = tokenizeNatural(b);
  const len = Math.min(ta.length, tb.length);

  for (let i = 0; i < len; i++) {
    const xa = ta[i];
    const xb = tb[i];
    if (typeof xa === 'number' && typeof xb === 'number') {
      if (xa !== xb) return xa - xb;
    } else if (typeof xa === 'string' && typeof xb === 'string') {
      const cmp = xa.localeCompare(xb, 'pt-BR', {sensitivity: 'base'});
      if (cmp !== 0) return cmp;
    } else {
      // Numbers before text tokens at same position when prefixes matched
      return typeof xa === 'number' ? -1 : 1;
    }
  }

  if (ta.length !== tb.length) return ta.length - tb.length;
  return a.localeCompare(b, 'pt-BR', {sensitivity: 'variant'});
}

/**
 * Extracts a chapter number from patterns like:
 * "Capítulo 001", "Cap. 12.5", "ch_03", "Chapter 4", "01 - Começo", "Vol.2 Cap.10"
 */
export function extractChapterNumber(name: string): number | null {
  const cleaned = name.replace(/\.[a-zA-Z0-9]{1,5}$/, '').trim();

  // Explicit chapter markers take priority over volume numbers
  const explicitMatch = cleaned.match(
    /(?:cap[ií]tulo|cap\.?|chapter|ch\.?|epis[oó]dio|ep\.?)\s*[-_:#.]?\s*(\d+(?:\.\d+)?)/i,
  );
  if (explicitMatch) {
    return Number(explicitMatch[1]);
  }

  // Patterns like "01-001" or "001" or "01 - Title"
  const leadingMatch = cleaned.match(/^0*(\d+(?:\.\d+)?)(?:\s*[-_.\s]|$)/);
  if (leadingMatch) {
    return Number(leadingMatch[1]);
  }

  // Fallback: last numeric token in string
  const allNums = [...cleaned.matchAll(/(\d+(?:\.\d+)?)/g)];
  if (allNums.length > 0) {
    return Number(allNums[allNums.length - 1][1]);
  }

  return null;
}

/**
 * Extracts a chapter prefix when flat image files encode chapter + page:
 * e.g., "cap01_001.jpg", "ch02-005.png", "01-002.webp"
 */
export function detectEmbeddedChapterKey(filename: string): string | null {
  const base = filename.replace(/\.[a-zA-Z0-9]{1,5}$/, '');
  const chMatch = base.match(
    /^((?:cap[ií]tulo|cap|chapter|ch|vol|v)?\s*[-_.]?\s*\d{1,4})\s*[-_]\s*\d{1,5}$/i,
  );
  if (chMatch) {
    const num = extractChapterNumber(chMatch[1]);
    if (num !== null) {
      return `Capítulo ${String(num).padStart(3, '0')}`;
    }
  }
  return null;
}
