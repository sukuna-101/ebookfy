import {BlobReader, BlobWriter, type Entry, ZipReader} from '@zip.js/zip.js';
import type {PageRef} from '../types/ebookfy';
import {getBlob} from './db';

interface CachedZip {
  reader: ZipReader<Blob>;
  entriesByPath: Map<string, Entry>;
}

const zipCache = new Map<string, CachedZip>();
const objectUrlCache = new Map<string, string>();
const urlOrder: string[] = [];
const MAX_OBJECT_URLS = 45;

async function getArchiveEntries(archiveBlobId: string): Promise<CachedZip | null> {
  const existing = zipCache.get(archiveBlobId);
  if (existing) return existing;

  const record = await getBlob(archiveBlobId);
  if (!record) return null;

  const reader = new ZipReader(new BlobReader(record.blob));
  const entries = await reader.getEntries();
  const entriesByPath = new Map<string, Entry>();
  for (const e of entries) {
    if (!e.directory) {
      entriesByPath.set(e.filename, e);
    }
  }
  const bundle = {reader, entriesByPath};
  zipCache.set(archiveBlobId, bundle);
  return bundle;
}

/**
 * Resolves a PageRef into a browser ObjectURL, extracting lazily from multi-GB ZIP/CBZ archives
 * without decoding entire chapters into RAM at once.
 */
export async function resolvePageObjectUrl(page: PageRef): Promise<string | null> {
  const cachedUrl = objectUrlCache.get(page.id);
  if (cachedUrl) {
    return cachedUrl;
  }

  let blob: Blob | null = null;

  if (page.blobId) {
    const rec = await getBlob(page.blobId);
    if (rec) blob = rec.blob;
  } else if (page.archiveBlobId && page.archiveEntryPath) {
    const zip = await getArchiveEntries(page.archiveBlobId);
    const entry = zip?.entriesByPath.get(page.archiveEntryPath);
    if (entry && !entry.directory && entry.getData) {
      blob = await entry.getData(new BlobWriter(page.mimeType || 'image/jpeg'));
    }
  }

  if (!blob) return null;

  const url = URL.createObjectURL(blob);
  objectUrlCache.set(page.id, url);
  urlOrder.push(page.id);

  // Evict oldest URLs to keep memory footprint bounded even on 300-page chapters
  while (urlOrder.length > MAX_OBJECT_URLS) {
    const oldestKey = urlOrder.shift();
    if (oldestKey && oldestKey !== page.id) {
      const oldUrl = objectUrlCache.get(oldestKey);
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
        objectUrlCache.delete(oldestKey);
      }
    }
  }

  return url;
}

export function clearPageUrlCache(): void {
  for (const url of objectUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  objectUrlCache.clear();
  urlOrder.length = 0;
  for (const bundle of zipCache.values()) {
    bundle.reader.close().catch(() => {});
  }
  zipCache.clear();
}
