import type {WorkCategory} from '../types/ebookfy';
import {
  compareNatural,
  detectEmbeddedChapterKey,
  extractChapterNumber,
} from './naturalSort';

export interface RawImageEntry {
  /** Relative path such as "Solo Leveling/Capítulo 001/001.jpg" or "001.jpg" */
  relativePath: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  /** Optional handle to identify the underlying source */
  payloadRef: string;
}

export interface OrganizedChapterPlan {
  title: string;
  orderIndex: number;
  chapterNumber: number | null;
  pages: RawImageEntry[];
}

export interface OrganizedWorkPlan {
  title: string;
  category: WorkCategory;
  chapters: OrganizedChapterPlan[];
}

export function inferCategoryFromHint(hint: string): WorkCategory {
  const low = hint.toLocaleLowerCase('pt-BR');
  if (/\bmanhwa\b/.test(low)) return 'manhwas';
  if (/\bmanhua\b/.test(low)) return 'manhuas';
  if (/\bwebtoon\b/.test(low)) return 'webtoons';
  if (/\b(hq|comic|quadrinho)\b/.test(low)) return 'hqs';
  if (/\bmang[aá]\b/.test(low)) return 'mangas';
  return 'mangas';
}

function cleanWorkTitle(raw: string): string {
  return raw
    .replace(/\.(zip|cbz|cbr|rar|7z|tar|gz|epub|pdf|txt|rtf|docx|odt)$/i, '')
    .replace(/[_]+/g, ' ')
    .trim();
}

/**
 * Organizes a flat or nested list of image entries (from folder import or ZIP/CBZ archive)
 * into properly ordered Works -> Chapters -> Pages using natural collation.
 * Prevents mixing pages of different chapters!
 */
export function organizeImageEntries(
  entries: RawImageEntry[],
  fallbackTitle: string,
  preferredCategory?: WorkCategory,
): OrganizedWorkPlan[] {
  if (entries.length === 0) return [];

  // Normalize slashes and drop leading empty segments
  const normalized = entries.map((e) => {
    const cleanPath = e.relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const parts = cleanPath.split('/').filter(Boolean);
    return {entry: e, parts};
  });

  // Determine structure depth:
  // Depth 1: ["001.jpg"] -> single work, check embedded chapter prefixes or single chapter
  // Depth 2: ["Capítulo 001", "001.jpg"] -> single work (fallbackTitle), multiple chapters
  // Depth 3+: ["Solo Leveling", "Capítulo 001", "001.jpg"] -> Work "Solo Leveling", Chapter "Capítulo 001"
  // Note: if root folder wraps everything (e.g., ["Ebookfy", "Solo Leveling", "Cap 1", "1.jpg"]), strip common non-chapter wrapper if needed.

  const maxDepth = Math.max(...normalized.map((n) => n.parts.length));

  // If all entries share the exact same top-level folder and maxDepth >= 3, that top folder might be either
  // the single Work title (depth 3: Work/Chapter/Page) OR a collection root (depth 4: Root/Work/Chapter/Page).
  const firstTopDirs = new Set(normalized.map((n) => (n.parts.length > 1 ? n.parts[0] : '')));
  let stripCommonCollectionRoot = false;
  if (firstTopDirs.size === 1 && maxDepth >= 4) {
    stripCommonCollectionRoot = true;
  }

  const adjusted = normalized.map((n) => ({
    entry: n.entry,
    parts: stripCommonCollectionRoot ? n.parts.slice(1) : n.parts,
  }));

  const workMap = new Map<string, Map<string, RawImageEntry[]>>();

  for (const item of adjusted) {
    const p = item.parts;
    let workName = cleanWorkTitle(fallbackTitle) || 'Obra Importada';
    let chapterName = 'Capítulo 001';

    if (p.length >= 3) {
      // Work / Chapter / ... / Page
      workName = cleanWorkTitle(p[0]);
      chapterName = p.slice(1, -1).join(' / ');
    } else if (p.length === 2) {
      // Chapter / Page  (inside a ZIP or selected folder named after the work)
      chapterName = p[0];
    } else {
      // Flat file: check if filename encodes chapter prefix like cap01_001.jpg
      const embedded = detectEmbeddedChapterKey(item.entry.fileName);
      if (embedded) {
        chapterName = embedded;
      }
    }

    if (!workMap.has(workName)) {
      workMap.set(workName, new Map());
    }
    const chMap = workMap.get(workName)!;
    if (!chMap.has(chapterName)) {
      chMap.set(chapterName, []);
    }
    chMap.get(chapterName)!.push(item.entry);
  }

  const plans: OrganizedWorkPlan[] = [];
  const sortedWorkNames = [...workMap.keys()].sort(compareNatural);

  for (const wName of sortedWorkNames) {
    const chMap = workMap.get(wName)!;
    const sortedChapterNames = [...chMap.keys()].sort(compareNatural);
    const chapters: OrganizedChapterPlan[] = sortedChapterNames.map((chTitle, idx) => {
      const pages = [...chMap.get(chTitle)!].sort((a, b) =>
        compareNatural(a.fileName, b.fileName),
      );
      return {
        title: chTitle,
        orderIndex: idx,
        chapterNumber: extractChapterNumber(chTitle),
        pages,
      };
    });

    plans.push({
      title: wName,
      category: preferredCategory ?? inferCategoryFromHint(wName),
      chapters,
    });
  }

  return plans;
}
