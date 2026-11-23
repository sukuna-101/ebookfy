import {openDB, type DBSchema, type IDBPDatabase} from 'idb';
import type {
  BookReaderPreferences,
  Bookmark,
  Chapter,
  Collection,
  Highlight,
  HistoryEntry,
  ImageReaderPreferences,
  ReadingProgress,
  SecuritySettings,
  StorageSettings,
  ThemeConfig,
  UserProfile,
  Work,
} from '../types/ebookfy';

export interface BlobRecord {
  id: string;
  workId: string;
  kind: 'page' | 'archive' | 'document' | 'cover';
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  createdAt: number;
}

interface EbookfyDB extends DBSchema {
  works: {
    key: string;
    value: Work;
    indexes: {'by-category': string; 'by-updated': number};
  };
  chapters: {
    key: string;
    value: Chapter;
    indexes: {'by-work': string};
  };
  blobs: {
    key: string;
    value: BlobRecord;
    indexes: {'by-work': string};
  };
  progress: {
    key: string;
    value: ReadingProgress;
  };
  bookmarks: {
    key: string;
    value: Bookmark;
    indexes: {'by-work': string};
  };
  highlights: {
    key: string;
    value: Highlight;
    indexes: {'by-work': string};
  };
  collections: {
    key: string;
    value: Collection;
  };
  history: {
    key: string;
    value: HistoryEntry;
    indexes: {'by-opened': number};
  };
  settings: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = 'ebookfy_local_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EbookfyDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<EbookfyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<EbookfyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('works')) {
          const store = db.createObjectStore('works', {keyPath: 'id'});
          store.createIndex('by-category', 'category');
          store.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('chapters')) {
          const store = db.createObjectStore('chapters', {keyPath: 'id'});
          store.createIndex('by-work', 'workId');
        }
        if (!db.objectStoreNames.contains('blobs')) {
          const store = db.createObjectStore('blobs', {keyPath: 'id'});
          store.createIndex('by-work', 'workId');
        }
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', {keyPath: 'workId'});
        }
        if (!db.objectStoreNames.contains('bookmarks')) {
          const store = db.createObjectStore('bookmarks', {keyPath: 'id'});
          store.createIndex('by-work', 'workId');
        }
        if (!db.objectStoreNames.contains('highlights')) {
          const store = db.createObjectStore('highlights', {keyPath: 'id'});
          store.createIndex('by-work', 'workId');
        }
        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections', {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains('history')) {
          const store = db.createObjectStore('history', {keyPath: 'id'});
          store.createIndex('by-opened', 'openedAt');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  activeTheme: 'gotico',
  primaryColor: '#E5092D',
  secondaryColor: '#650D20',
  backgroundColor: '#080607',
  surfaceOpacity: 0.92,
  blurIntensity: 10,
  borderRadius: 12,
  fontScale: 1,
  animationsEnabled: true,
  customWallpaperDataUrl: null,
};

export const DEFAULT_IMAGE_READER_PREFS: ImageReaderPreferences = {
  mode: 'vertical',
  direction: 'ltr',
  fitMode: 'width',
  bgColor: 'black',
  imageWidthPercent: 78,
  panelGapPx: 6,
  zoomPercent: 100,
  brightnessPercent: 100,
  autoHideControls: true,
  continuousScroll: true,
};

export const DEFAULT_BOOK_READER_PREFS: BookReaderPreferences = {
  theme: 'dark_comfort',
  fontFamily: 'lora',
  fontSizePx: 19,
  lineHeight: 1.75,
  marginPx: 28,
  textAlign: 'left',
};

export const DEFAULT_STORAGE_SETTINGS: StorageSettings = {
  customQuotaBytes: 0, // 0 = sem limite artificial
  autoGenerateThumbnails: true,
};

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  lockEnabled: false,
  passwordHash: null,
  passwordSalt: null,
  inactivityMinutes: 0,
  recoveryCodeHash: null,
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Gabriel',
  tierLabel: 'Premium',
  avatarDataUrl: null,
};

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = await getDB();
  const val = await db.get('settings', key);
  return (val as T | undefined) ?? fallback;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('settings', value, key);
}

export async function getAllWorks(): Promise<Work[]> {
  const db = await getDB();
  const works = await db.getAll('works');
  return works.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getChaptersByWork(workId: string): Promise<Chapter[]> {
  const db = await getDB();
  const chapters = await db.getAllFromIndex('chapters', 'by-work', workId);
  return chapters.sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function saveChapters(chapters: Chapter[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('chapters', 'readwrite');
  for (const ch of chapters) {
    await tx.store.put(ch);
  }
  await tx.done;
}

export async function saveWork(work: Work): Promise<void> {
  const db = await getDB();
  await db.put('works', work);
}

export async function saveBlob(record: BlobRecord): Promise<void> {
  const db = await getDB();
  await db.put('blobs', record);
}

export async function getBlob(id: string): Promise<BlobRecord | undefined> {
  const db = await getDB();
  return db.get('blobs', id);
}

export async function getAllBlobs(): Promise<BlobRecord[]> {
  const db = await getDB();
  return db.getAll('blobs');
}

export async function deleteWorkCompletely(workId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['works', 'chapters', 'blobs', 'progress', 'bookmarks', 'highlights', 'history'],
    'readwrite',
  );
  await tx.objectStore('works').delete(workId);
  await tx.objectStore('progress').delete(workId);

  const chapters = await tx.objectStore('chapters').index('by-work').getAllKeys(workId);
  for (const k of chapters) await tx.objectStore('chapters').delete(k);

  const blobs = await tx.objectStore('blobs').index('by-work').getAllKeys(workId);
  for (const k of blobs) await tx.objectStore('blobs').delete(k);

  const bms = await tx.objectStore('bookmarks').index('by-work').getAllKeys(workId);
  for (const k of bms) await tx.objectStore('bookmarks').delete(k);

  const hls = await tx.objectStore('highlights').index('by-work').getAllKeys(workId);
  for (const k of hls) await tx.objectStore('highlights').delete(k);

  const allHistory = await tx.objectStore('history').getAll();
  for (const h of allHistory) {
    if (h.workId === workId) await tx.objectStore('history').delete(h.id);
  }

  await tx.done;
}

export async function getAllProgress(): Promise<ReadingProgress[]> {
  const db = await getDB();
  return db.getAll('progress');
}

export async function saveProgress(prog: ReadingProgress): Promise<void> {
  const db = await getDB();
  await db.put('progress', prog);
}

export async function getBookmarksByWork(workId: string): Promise<Bookmark[]> {
  const db = await getDB();
  return db.getAllFromIndex('bookmarks', 'by-work', workId);
}

export async function saveBookmark(bm: Bookmark): Promise<void> {
  const db = await getDB();
  await db.put('bookmarks', bm);
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('bookmarks', id);
}

export async function getHighlightsByWork(workId: string): Promise<Highlight[]> {
  const db = await getDB();
  return db.getAllFromIndex('highlights', 'by-work', workId);
}

export async function saveHighlight(hl: Highlight): Promise<void> {
  const db = await getDB();
  await db.put('highlights', hl);
}

export async function deleteHighlight(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('highlights', id);
}

export async function getAllCollections(): Promise<Collection[]> {
  const db = await getDB();
  return db.getAll('collections');
}

export async function saveCollection(col: Collection): Promise<void> {
  const db = await getDB();
  await db.put('collections', col);
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('collections', id);
}

export async function getAllHistory(): Promise<HistoryEntry[]> {
  const db = await getDB();
  const entries = await db.getAll('history');
  return entries.sort((a, b) => b.openedAt - a.openedAt);
}

export async function pushHistoryEntry(entry: HistoryEntry): Promise<void> {
  const db = await getDB();
  await db.put('history', entry);
}

export async function clearHistory(): Promise<void> {
  const db = await getDB();
  await db.clear('history');
}

export async function getTotalStoredBytes(): Promise<{
  totalBytes: number;
  worksBytes: number;
  documentsBytes: number;
  coversBytes: number;
}> {
  const db = await getDB();
  const blobs = await db.getAll('blobs');
  const works = await db.getAll('works');
  let worksBytes = 0;
  let documentsBytes = 0;

  for (const b of blobs) {
    if (b.kind === 'document') {
      documentsBytes += b.sizeBytes;
    } else {
      worksBytes += b.sizeBytes;
    }
  }

  let coversBytes = 0;
  for (const w of works) {
    if (w.coverDataUrl) {
      coversBytes += w.coverDataUrl.length;
    }
  }

  return {
    totalBytes: worksBytes + documentsBytes + coversBytes,
    worksBytes,
    documentsBytes,
    coversBytes,
  };
}
