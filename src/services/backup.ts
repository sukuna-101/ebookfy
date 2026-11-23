import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js';
import type {
  BackupManifest,
  Chapter,
  Collection,
  ReadingProgress,
  Work,
} from '../types/ebookfy';
import {sha256Hex} from '../utils/cryptoSecurity';
import {
  getAllBlobs,
  getAllCollections,
  getAllHistory,
  getAllProgress,
  getAllWorks,
  getDB,
  saveBlob,
  saveChapters,
  saveCollection,
  saveProgress,
  saveWork,
} from './db';

interface BackupPayload {
  manifest: BackupManifest;
  works: Work[];
  chapters: Chapter[];
  progress: ReadingProgress[];
  collections: Collection[];
  settings: Record<string, unknown>;
}

export async function exportBackupZip(options: {
  includeMedia: boolean;
  selectedWorkIds?: string[];
  password?: string;
}): Promise<{blob: Blob; fileName: string; manifest: BackupManifest}> {
  const allWorks = await getAllWorks();
  const targetWorks = options.selectedWorkIds?.length
    ? allWorks.filter((w) => options.selectedWorkIds!.includes(w.id))
    : allWorks;
  const targetIds = new Set(targetWorks.map((w) => w.id));

  const db = await getDB();
  const allChapters = await db.getAll('chapters');
  const chapters = allChapters.filter((c) => targetIds.has(c.workId));
  const progress = (await getAllProgress()).filter((p) => targetIds.has(p.workId));
  const collections = await getAllCollections();
  const history = (await getAllHistory()).filter((h) => targetIds.has(h.workId));

  const settingsKeys = await db.getAllKeys('settings');
  const settings: Record<string, unknown> = {};
  for (const k of settingsKeys) {
    settings[String(k)] = await db.get('settings', k);
  }

  const dataJson = JSON.stringify({
    works: targetWorks,
    chapters,
    progress,
    collections,
    history,
    settings,
  });
  const checksumSha256 = await sha256Hex(dataJson);

  const manifest: BackupManifest = {
    app: 'Ebookfy',
    version: 1,
    createdAt: Date.now(),
    includeMedia: options.includeMedia,
    workCount: targetWorks.length,
    checksumSha256,
  };

  const writer = new ZipWriter(new BlobWriter('application/zip'), {
    password: options.password || undefined,
  });

  await writer.add('manifest.json', new TextReader(JSON.stringify(manifest, null, 2)));
  await writer.add('library.json', new TextReader(dataJson));

  if (options.includeMedia) {
    const blobs = (await getAllBlobs()).filter((b) => targetIds.has(b.workId));
    for (const b of blobs) {
      await writer.add(`media/${b.id}.bin`, new BlobReader(b.blob));
      await writer.add(
        `media/${b.id}.meta.json`,
        new TextReader(
          JSON.stringify({
            id: b.id,
            workId: b.workId,
            kind: b.kind,
            mimeType: b.mimeType,
            sizeBytes: b.sizeBytes,
            createdAt: b.createdAt,
          }),
        ),
      );
    }
  }

  const blob = await writer.close();
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `ebookfy-backup-${dateStr}.zip`;
  return {blob, fileName, manifest};
}

export async function inspectBackupZip(
  file: File,
  password?: string,
): Promise<{
  manifest: BackupManifest;
  payload: BackupPayload;
  mediaCount: number;
  checksumValid: boolean;
}> {
  const reader = new ZipReader(new BlobReader(file), {
    password: password || undefined,
  });
  try {
    const entries = await reader.getEntries();
    const manifestEntry = entries.find((e) => !e.directory && e.filename === 'manifest.json');
    const libEntry = entries.find((e) => !e.directory && e.filename === 'library.json');
    if (
      !manifestEntry ||
      manifestEntry.directory ||
      !manifestEntry.getData ||
      !libEntry ||
      libEntry.directory ||
      !libEntry.getData
    ) {
      throw new Error('Arquivo de backup Ebookfy inválido.');
    }
    const manifest = JSON.parse(await manifestEntry.getData(new TextWriter())) as BackupManifest;
    const libStr = await libEntry.getData(new TextWriter());
    const computedHash = await sha256Hex(libStr);
    const parsed = JSON.parse(libStr);
    const mediaCount = entries.filter((e) => e.filename.endsWith('.bin')).length;

    return {
      manifest,
      payload: {
        manifest,
        works: parsed.works ?? [],
        chapters: parsed.chapters ?? [],
        progress: parsed.progress ?? [],
        collections: parsed.collections ?? [],
        settings: parsed.settings ?? {},
      },
      mediaCount,
      checksumValid: computedHash === manifest.checksumSha256,
    };
  } finally {
    await reader.close();
  }
}

export async function restoreBackupZip(
  file: File,
  options: {password?: string; overwriteExisting: boolean; selectedWorkIds?: string[]},
): Promise<{restoredWorks: number; skippedWorks: number}> {
  const inspected = await inspectBackupZip(file, options.password);
  const existingWorks = await getAllWorks();
  const existingIds = new Set(existingWorks.map((w) => w.id));

  const targetWorks = options.selectedWorkIds?.length
    ? inspected.payload.works.filter((w) => options.selectedWorkIds!.includes(w.id))
    : inspected.payload.works;

  let restoredWorks = 0;
  let skippedWorks = 0;
  const restoredIds = new Set<string>();

  for (const w of targetWorks) {
    if (existingIds.has(w.id) && !options.overwriteExisting) {
      skippedWorks++;
      continue;
    }
    await saveWork(w);
    restoredIds.add(w.id);
    restoredWorks++;
  }

  const chaptersToSave = inspected.payload.chapters.filter((c) => restoredIds.has(c.workId));
  await saveChapters(chaptersToSave);

  for (const p of inspected.payload.progress) {
    if (restoredIds.has(p.workId)) await saveProgress(p);
  }
  for (const col of inspected.payload.collections) {
    await saveCollection(col);
  }

  if (inspected.manifest.includeMedia && restoredIds.size > 0) {
    const reader = new ZipReader(new BlobReader(file), {
      password: options.password || undefined,
    });
    try {
      const entries = await reader.getEntries();
      const entryMap = new Map(entries.filter((e) => !e.directory).map((e) => [e.filename, e]));
      for (const e of entries) {
        if (!e.directory && e.filename.startsWith('media/') && e.filename.endsWith('.meta.json') && e.getData) {
          const meta = JSON.parse(await e.getData(new TextWriter()));
          if (!restoredIds.has(meta.workId)) continue;
          const binEntry = entryMap.get(`media/${meta.id}.bin`);
          if (binEntry && !binEntry.directory && binEntry.getData) {
            const blob = await binEntry.getData(new BlobWriter(meta.mimeType));
            await saveBlob({
              id: meta.id,
              workId: meta.workId,
              kind: meta.kind,
              mimeType: meta.mimeType,
              sizeBytes: meta.sizeBytes,
              blob,
              createdAt: meta.createdAt,
            });
          }
        }
      }
    } finally {
      await reader.close();
    }
  }

  return {restoredWorks, skippedWorks};
}
