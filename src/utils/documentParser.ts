import type {BookChapterContent} from '../types/ebookfy';

/**
 * Splits a plain text book into readable chapters if chapter markers exist,
 * otherwise chunks cleanly by paragraphs so large TXT books stay responsive.
 */
export function parsePlainTextBook(rawText: string, bookTitle: string): BookChapterContent[] {
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) {
    return [{title: bookTitle, htmlOrText: '', isHtml: false}];
  }

  const lines = normalized.split('\n');
  const chapterHeadingRe =
    /^(?:cap[ií]tulo|chapter|parte|part|pr[oó]logo|prologue|ep[ií]logo|epilogue)\s*[0-9ivxlcdm]*[:.\-\s]*.*$/i;

  const sections: Array<{title: string; lines: string[]}> = [];
  let current: {title: string; lines: string[]} = {title: 'Início', lines: []};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed.length <= 90 && chapterHeadingRe.test(trimmed)) {
      if (current.lines.some((l) => l.trim().length > 0)) {
        sections.push(current);
      }
      current = {title: trimmed, lines: []};
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.some((l) => l.trim().length > 0)) {
    sections.push(current);
  }

  if (sections.length > 1) {
    return sections.map((s) => ({
      title: s.title,
      htmlOrText: s.lines.join('\n').trim(),
      isHtml: false,
    }));
  }

  // Chunk large single-block TXT files (~12,000 chars per section on paragraph boundaries)
  const CHUNK_TARGET = 12000;
  if (normalized.length <= CHUNK_TARGET) {
    return [{title: bookTitle, htmlOrText: normalized, isHtml: false}];
  }

  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: BookChapterContent[] = [];
  let acc: string[] = [];
  let accLen = 0;

  for (const p of paragraphs) {
    acc.push(p);
    accLen += p.length;
    if (accLen >= CHUNK_TARGET) {
      chunks.push({
        title: `Parte ${chunks.length + 1}`,
        htmlOrText: acc.join('\n\n'),
        isHtml: false,
      });
      acc = [];
      accLen = 0;
    }
  }
  if (acc.length > 0) {
    chunks.push({
      title: `Parte ${chunks.length + 1}`,
      htmlOrText: acc.join('\n\n'),
      isHtml: false,
    });
  }

  return chunks;
}

/**
 * Pure TypeScript RTF text extractor converting RTF control groups into clean readable paragraphs.
 */
export function parseRtfToText(rtf: string): string {
  let out = '';
  let depth = 0;
  let skipGroupDepth = -1;
  let i = 0;

  while (i < rtf.length) {
    const ch = rtf[i];
    if (ch === '{') {
      depth++;
      // Skip metadata/header groups like {\fonttbl...}, {\colortbl...}, {\stylesheet...}, {\info...}
      const lookahead = rtf.slice(i + 1, i + 20);
      if (
        skipGroupDepth === -1 &&
        /^\\(?:fonttbl|colortbl|stylesheet|info|pict|object|\*\\)/.test(lookahead)
      ) {
        skipGroupDepth = depth;
      }
      i++;
      continue;
    }
    if (ch === '}') {
      if (depth === skipGroupDepth) {
        skipGroupDepth = -1;
      }
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }
    if (skipGroupDepth !== -1) {
      i++;
      continue;
    }
    if (ch === '\\') {
      const next = rtf[i + 1];
      if (next === '\\' || next === '{' || next === '}') {
        out += next;
        i += 2;
        continue;
      }
      if (next === "'") {
        const hex = rtf.slice(i + 2, i + 4);
        const code = parseInt(hex, 16);
        if (!Number.isNaN(code)) {
          out += String.fromCharCode(code);
        }
        i += 4;
        continue;
      }
      const ctrlMatch = rtf.slice(i + 1).match(/^([a-zA-Z]+)(-?\d+)? ?/);
      if (ctrlMatch) {
        const word = ctrlMatch[1];
        if (word === 'par' || word === 'line') {
          out += '\n\n';
        } else if (word === 'tab') {
          out += '  ';
        }
        i += 1 + ctrlMatch[0].length;
        continue;
      }
      i += 2;
      continue;
    }
    if (ch !== '\r' && ch !== '\n') {
      out += ch;
    }
    i++;
  }

  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Strips scripts, iframes, event handlers, and dangerous URLs from EPUB XHTML
 * before rendering inside the reader.
 */
export function sanitizeBookHtml(rawHtml: string): string {
  return rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

export interface TarEntry {
  name: string;
  size: number;
  data: Uint8Array;
}

/**
 * Parses a standard POSIX/USTAR TAR archive byte array into individual file entries.
 */
export function parseTarArchive(bytes: Uint8Array): TarEntry[] {
  const entries: TarEntry[] = [];
  let offset = 0;

  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    // Check for empty 512-byte EOF block
    let isZero = true;
    for (let j = 0; j < 512; j++) {
      if (header[j] !== 0) {
        isZero = false;
        break;
      }
    }
    if (isZero) break;

    const readStr = (start: number, len: number) => {
      let end = start;
      while (end < start + len && header[end] !== 0) end++;
      return new TextDecoder('utf-8').decode(header.subarray(start, end));
    };

    const name = readStr(0, 100);
    const prefix = readStr(345, 155);
    const fullName = prefix ? `${prefix}/${name}` : name;
    const sizeOctal = readStr(124, 12).trim().replace(/\0/g, '');
    const size = parseInt(sizeOctal || '0', 8) || 0;
    const typeFlag = String.fromCharCode(header[156] || 48);

    offset += 512;
    const data = bytes.subarray(offset, Math.min(bytes.length, offset + size));
    const paddedSize = Math.ceil(size / 512) * 512;
    offset += paddedSize;

    // '0' or '\0' = regular file
    if ((typeFlag === '0' || typeFlag === '\0') && fullName && size > 0) {
      entries.push({name: fullName, size, data});
    }
  }

  return entries;
}
