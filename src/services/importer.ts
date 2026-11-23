import {BlobReader, BlobWriter, TextWriter, ZipReader} from '@zip.js/zip.js';
import * as pdfjsLib from 'pdfjs-dist';
import type {
  BookChapterContent,
  Chapter,
  ImportJobItem,
  PageRef,
  Work,
  WorkCategory,
} from '../types/ebookfy';
import {
  inferCategoryFromHint,
  organizeImageEntries,
  type RawImageEntry,
} from '../utils/chapterOrganizer';
import {
  parsePlainTextBook,
  parseRtfToText,
  parseTarArchive,
  sanitizeBookHtml,
} from '../utils/documentParser';
import {
  checkZipBombRisk,
  detectFileTypeFromBytes,
  type DetectedFileType,
  getExtension,
  isImageType,
  isSafeArchiveEntryPath,
  mimeTypeForDetected,
  sanitizeFileName,
} from '../utils/fileSignature';
import {compareNatural, extractChapterNumber} from '../utils/naturalSort';
import {
  DEFAULT_STORAGE_SETTINGS,
  getAllWorks,
  getSetting,
  getTotalStoredBytes,
  saveBlob,
  saveChapters,
  saveWork,
} from './db';
import {createThumbnailDataUrl, readImageDimensions} from './thumbnails';

pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';

export interface ImportedFileWithPath {
  file: File;
  relativePath: string;
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function readMagicHeader(blob: Blob, len = 512): Promise<Uint8Array> {
  const buf = await blob.slice(0, len).arrayBuffer();
  return new Uint8Array(buf);
}

async function checkQuotaAllows(additionalBytes: number): Promise<void> {
  const storageSettings = await getSetting('storageSettings', DEFAULT_STORAGE_SETTINGS);
  if (storageSettings.customQuotaBytes > 0) {
    const usage = await getTotalStoredBytes();
    if (usage.totalBytes + additionalBytes > storageSettings.customQuotaBytes) {
      const limitMb = Math.round(storageSettings.customQuotaBytes / (1024 * 1024));
      throw new Error(
        `Limite de armazenamento local configurado (${limitMb} MB) atingido. Aumente a cota em Armazenamento.`,
      );
    }
  }
}

async function parseEpubFromFile(file: File): Promise<{
  title: string;
  author: string;
  description: string;
  chapters: BookChapterContent[];
  coverDataUrl: string | null;
}> {
  const reader = new ZipReader(new BlobReader(file));
  try {
    const entries = await reader.getEntries();
    const entryMap = new Map(entries.filter((e) => !e.directory).map((e) => [e.filename, e]));

    // 1. Read META-INF/container.xml
    const containerEntry = entryMap.get('META-INF/container.xml');
    let opfPath = '';
    if (containerEntry && !containerEntry.directory && containerEntry.getData) {
      const containerXml = await containerEntry.getData(new TextWriter());
      const doc = new DOMParser().parseFromString(containerXml, 'application/xml');
      opfPath =
        doc.querySelector('rootfile')?.getAttribute('full-path') ?? '';
    }

    if (!opfPath) {
      const fallbackOpf = entries.find((e) => !e.directory && e.filename.endsWith('.opf'));
      opfPath = fallbackOpf?.filename ?? '';
    }

    if (!opfPath || !entryMap.has(opfPath)) {
      throw new Error('EPUB inválido: arquivo OPF não encontrado.');
    }

    const opfBaseDir = opfPath.includes('/')
      ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1)
      : '';
    const opfEntry = entryMap.get(opfPath)!;
    if (opfEntry.directory || !opfEntry.getData) {
      throw new Error('EPUB inválido: arquivo OPF ilegível.');
    }
    const opfXml = await opfEntry.getData(new TextWriter());
    const opfDoc = new DOMParser().parseFromString(opfXml, 'application/xml');

    const title =
      opfDoc.querySelector('title')?.textContent?.trim() ||
      file.name.replace(/\.epub$/i, '');
    const author =
      opfDoc.querySelector('creator')?.textContent?.trim() || 'Autor desconhecido';
    const description =
      opfDoc.querySelector('description')?.textContent?.trim() || '';

    const manifest = new Map<string, {href: string; mediaType: string; properties: string}>();
    opfDoc.querySelectorAll('manifest > item').forEach((item) => {
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      const mediaType = item.getAttribute('media-type') ?? '';
      const properties = item.getAttribute('properties') ?? '';
      if (id && href) {
        manifest.set(id, {href: decodeURIComponent(href), mediaType, properties});
      }
    });

    // Resolve cover image if present
    let coverDataUrl: string | null = null;
    const coverMetaId =
      opfDoc.querySelector('meta[name="cover"]')?.getAttribute('content') ?? null;
    let coverPath: string | null = null;
    if (coverMetaId && manifest.has(coverMetaId)) {
      coverPath = opfBaseDir + manifest.get(coverMetaId)!.href;
    } else {
      for (const item of manifest.values()) {
        if (item.properties.includes('cover-image') || /cover.*\.(jpe?g|png|webp)$/i.test(item.href)) {
          coverPath = opfBaseDir + item.href;
          break;
        }
      }
    }
    if (coverPath && entryMap.has(coverPath)) {
      const cEntry = entryMap.get(coverPath)!;
      if (!cEntry.directory && cEntry.getData) {
        const coverBlob = await cEntry.getData(new BlobWriter());
        coverDataUrl = await createThumbnailDataUrl(coverBlob);
      }
    }

    // Spine order
    const spineIds: string[] = [];
    opfDoc.querySelectorAll('spine > itemref').forEach((ref) => {
      const idref = ref.getAttribute('idref');
      if (idref) spineIds.push(idref);
    });

    const chapters: BookChapterContent[] = [];
    for (let i = 0; i < spineIds.length; i++) {
      const item = manifest.get(spineIds[i]);
      if (!item) continue;
      const fullPath = opfBaseDir + item.href;
      const entry = entryMap.get(fullPath);
      if (!entry || entry.directory || !entry.getData) continue;
      if (!isSafeArchiveEntryPath(fullPath)) continue;

      const rawXhtml = await entry.getData(new TextWriter());
      const parsed = new DOMParser().parseFromString(rawXhtml, 'text/html');
      const heading =
        parsed.querySelector('h1, h2, h3, title')?.textContent?.trim() ||
        `Capítulo ${i + 1}`;
      const bodyHtml = parsed.body?.innerHTML || rawXhtml;
      const cleanHtml = sanitizeBookHtml(bodyHtml);
      const textLen = (parsed.body?.textContent || '').trim().length;
      if (textLen > 0) {
        chapters.push({
          title: heading,
          htmlOrText: cleanHtml,
          isHtml: true,
        });
      }
    }

    if (chapters.length === 0) {
      throw new Error('Nenhum texto legível encontrado neste arquivo EPUB.');
    }

    return {title, author, description, chapters, coverDataUrl};
  } finally {
    await reader.close();
  }
}

async function parseDocxOrOdt(
  file: File,
  type: 'docx' | 'odt',
): Promise<BookChapterContent[]> {
  const reader = new ZipReader(new BlobReader(file));
  try {
    const entries = await reader.getEntries();
    const targetFile = type === 'docx' ? 'word/document.xml' : 'content.xml';
    const docEntry = entries.find((e) => !e.directory && e.filename === targetFile);
    if (!docEntry || docEntry.directory || !docEntry.getData) {
      throw new Error(`Estrutura ${type.toUpperCase()} inválida.`);
    }
    const xmlStr = await docEntry.getData(new TextWriter());
    const xmlDoc = new DOMParser().parseFromString(xmlStr, 'application/xml');
    const paragraphs: string[] = [];

    if (type === 'docx') {
      xmlDoc.querySelectorAll('p').forEach((p) => {
        const text = p.textContent?.trim();
        if (text) paragraphs.push(text);
      });
    } else {
      xmlDoc.querySelectorAll('p, h').forEach((node) => {
        const text = node.textContent?.trim();
        if (text) paragraphs.push(text);
      });
    }

    const joined = paragraphs.join('\n\n');
    return parsePlainTextBook(joined, file.name.replace(/\.(docx|odt)$/i, ''));
  } finally {
    await reader.close();
  }
}

async function renderPdfCoverAndCount(
  file: File,
): Promise<{pageCount: number; coverDataUrl: string | null}> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({data}).promise;
  const pageCount = pdf.numPages;
  let coverDataUrl: string | null = null;
  try {
    const firstPage = await pdf.getPage(1);
    const viewport = firstPage.getViewport({scale: 0.75});
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      await firstPage.render({canvasContext: ctx, viewport, canvas}).promise;
      coverDataUrl = canvas.toDataURL('image/jpeg', 0.82);
    }
  } catch {
    coverDataUrl = null;
  }
  await pdf.cleanup();
  return {pageCount, coverDataUrl};
}

export interface ImportOptions {
  preferredCategory?: WorkCategory;
  targetWorkTitle?: string;
  onJobUpdate?: (jobs: ImportJobItem[]) => void;
}

/**
 * Universal local importer:
 * - Reads magic bytes to verify true content type
 * - Validates against ZIP bombs, path traversal, and executable scripts
 * - Lazily stores huge ZIP/CBZ archives (even hundreds of MB or multi-GB) without full RAM extraction
 * - Orders chapters & pages naturally (1, 2, 3, ..., 10)
 */
export async function importFilesIntoLibrary(
  inputs: ImportedFileWithPath[],
  options: ImportOptions = {},
): Promise<{createdWorks: Work[]; errors: string[]}> {
  const existingWorks = await getAllWorks();
  const existingTitles = new Set(existingWorks.map((w) => w.title.toLocaleLowerCase('pt-BR')));
  const createdWorks: Work[] = [];
  const errors: string[] = [];

  const jobs: ImportJobItem[] = inputs.map((item, idx) => ({
    id: `job_${idx}_${item.file.name}`,
    fileName: item.relativePath || item.file.name,
    detectedType: 'Analisando...',
    sizeBytes: item.file.size,
    progress: 0,
    stage: 'Na fila',
    status: 'pending',
  }));

  const notify = () => options.onJobUpdate?.([...jobs]);
  notify();

  // Separate loose images (to organize together as folder/collection) from standalone books/archives
  const looseImages: Array<{
    item: ImportedFileWithPath;
    detected: DetectedFileType;
    jobIdx: number;
  }> = [];

  for (let i = 0; i < inputs.length; i++) {
    const inp = inputs[i];
    const job = jobs[i];
    job.status = 'processing';
    job.stage = 'Verificando assinatura';
    job.progress = 15;
    notify();

    try {
      const header = await readMagicHeader(inp.file);
      let detected = detectFileTypeFromBytes(header, inp.file.name);

      // Handle gzip-compressed tar or gz
      if (detected === 'gzip') {
        const ext = getExtension(inp.file.name);
        if (ext === 'gz' || ext === 'tgz' || inp.file.name.toLowerCase().endsWith('.tar.gz')) {
          detected = 'gzip';
        }
      }

      job.detectedType = detected.toUpperCase();
      await checkQuotaAllows(inp.file.size);

      if (detected === 'rar' || detected === '7z') {
        throw new Error(
          `Formato ${detected.toUpperCase()} usa compressão proprietária não suportada nativamente no navegador sem servidor. Converta para CBZ ou ZIP para leitura 100% local.`,
        );
      }

      if (isImageType(detected)) {
        looseImages.push({item: inp, detected, jobIdx: i});
        job.stage = 'Agrupando páginas';
        job.progress = 40;
        notify();
        continue;
      }

      if (detected === 'zip') {
        job.stage = 'Indexando arquivo compactado';
        job.progress = 45;
        notify();

        const reader = new ZipReader(new BlobReader(inp.file));
        const entries = await reader.getEntries();
        const imageEntries: RawImageEntry[] = [];

        for (const entry of entries) {
          if (entry.directory) continue;
          if (!isSafeArchiveEntryPath(entry.filename)) continue;
          const bombCheck = checkZipBombRisk(
            entry.compressedSize ?? 0,
            entry.uncompressedSize ?? 0,
          );
          if (!bombCheck.safe) {
            throw new Error(`${entry.filename}: ${bombCheck.reason}`);
          }
          const ext = getExtension(entry.filename);
          if (
            ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'avif'].includes(
              ext,
            )
          ) {
            const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext === 'tif' ? 'tiff' : ext}`;
            imageEntries.push({
              relativePath: entry.filename,
              fileName: entry.filename.split('/').pop() || entry.filename,
              sizeBytes: entry.uncompressedSize ?? 0,
              mimeType: mime,
              payloadRef: entry.filename,
            });
          }
        }
        await reader.close();

        if (imageEntries.length === 0) {
          throw new Error('Nenhuma imagem válida encontrada dentro do arquivo ZIP/CBZ.');
        }

        const archiveBlobId = makeId('archive');
        const fallbackTitle =
          options.targetWorkTitle ||
          sanitizeFileName(inp.file.name.replace(/\.(zip|cbz)$/i, ''));
        const plans = organizeImageEntries(
          imageEntries,
          fallbackTitle,
          options.preferredCategory,
        );

        // Store the archive blob once so even multi-GB CBZ/ZIP files require zero extra RAM copy!
        const primaryWorkId = makeId('work');
        await saveBlob({
          id: archiveBlobId,
          workId: primaryWorkId,
          kind: 'archive',
          mimeType: 'application/zip',
          sizeBytes: inp.file.size,
          blob: inp.file,
          createdAt: Date.now(),
        });

        // Extract first page for cover thumbnail
        let coverDataUrl: string | null = null;
        try {
          const coverReader = new ZipReader(new BlobReader(inp.file));
          const allE = await coverReader.getEntries();
          const firstImgPath = plans[0]?.chapters[0]?.pages[0]?.payloadRef;
          const coverEntry = allE.find((e) => !e.directory && e.filename === firstImgPath);
          if (coverEntry && !coverEntry.directory && coverEntry.getData) {
            const cBlob = await coverEntry.getData(new BlobWriter());
            coverDataUrl = await createThumbnailDataUrl(cBlob);
          }
          await coverReader.close();
        } catch {
          coverDataUrl = null;
        }

        for (let pIdx = 0; pIdx < plans.length; pIdx++) {
          const plan = plans[pIdx];
          const wId = pIdx === 0 ? primaryWorkId : makeId('work');
          let uniqueTitle = plan.title;
          if (existingTitles.has(uniqueTitle.toLocaleLowerCase('pt-BR'))) {
            uniqueTitle = `${uniqueTitle} (Cópia)`;
          }
          existingTitles.add(uniqueTitle.toLocaleLowerCase('pt-BR'));

          const chapters: Chapter[] = plan.chapters.map((ch) => {
            const chId = makeId('ch');
            const pages: PageRef[] = ch.pages.map((pg, idx) => ({
              id: makeId('pg'),
              name: pg.fileName,
              orderIndex: idx,
              mimeType: pg.mimeType,
              sizeBytes: pg.sizeBytes,
              archiveBlobId,
              archiveEntryPath: pg.payloadRef,
            }));
            return {
              id: chId,
              workId: wId,
              title: ch.title,
              orderIndex: ch.orderIndex,
              chapterNumber: ch.chapterNumber,
              pageCount: pages.length,
              totalBytes: pages.reduce((acc, s) => acc + s.sizeBytes, 0),
              pages,
            };
          });

          const totalPages = chapters.reduce((acc, c) => acc + c.pageCount, 0);
          const work: Work = {
            id: wId,
            title: uniqueTitle,
            author: '',
            description: `Importado de ${inp.file.name} (${chapters.length} capítulo${chapters.length === 1 ? '' : 's'}).`,
            category: plan.category,
            contentKind: 'images',
            formatLabel: inp.file.name.toLowerCase().endsWith('.cbz') ? 'CBZ' : 'ZIP',
            coverDataUrl,
            chapterCount: chapters.length,
            pageCount: totalPages,
            totalBytes: pIdx === 0 ? inp.file.size : 0,
            isFavorite: false,
            collectionIds: [],
            importedAt: Date.now(),
            updatedAt: Date.now(),
            sourceName: inp.file.name,
            archiveBlobId,
          };

          await saveChapters(chapters);
          await saveWork(work);
          createdWorks.push(work);
        }

        job.status = 'done';
        job.progress = 100;
        job.stage = 'Concluído';
        job.workTitle = plans.map((p) => p.title).join(', ');
        notify();
        continue;
      }

      if (detected === 'tar' || detected === 'gzip') {
        job.stage = 'Extraindo TAR/GZIP';
        job.progress = 50;
        notify();

        let tarBytes: Uint8Array;
        if (detected === 'gzip') {
          const ds = new DecompressionStream('gzip');
          const decompressed = await new Response(
            inp.file.stream().pipeThrough(ds),
          ).arrayBuffer();
          tarBytes = new Uint8Array(decompressed);
        } else {
          tarBytes = new Uint8Array(await inp.file.arrayBuffer());
        }

        const tarEntries = parseTarArchive(tarBytes);
        const rawImgs: RawImageEntry[] = [];
        const extractedBlobs = new Map<string, Blob>();

        for (const te of tarEntries) {
          if (!isSafeArchiveEntryPath(te.name)) continue;
          const imgType = detectFileTypeFromBytes(te.data, te.name);
          if (isImageType(imgType)) {
            const mime = mimeTypeForDetected(imgType);
            const copy = new Uint8Array(te.data.byteLength);
            copy.set(te.data);
            extractedBlobs.set(te.name, new Blob([copy.buffer], {type: mime}));
            rawImgs.push({
              relativePath: te.name,
              fileName: te.name.split('/').pop() || te.name,
              sizeBytes: te.size,
              mimeType: mime,
              payloadRef: te.name,
            });
          }
        }

        if (rawImgs.length === 0) {
          throw new Error('Nenhuma imagem suportada encontrada no arquivo TAR/GZIP.');
        }

        const plans = organizeImageEntries(
          rawImgs,
          inp.file.name.replace(/\.(tar\.gz|tgz|tar|gz)$/i, ''),
          options.preferredCategory,
        );

        for (const plan of plans) {
          const wId = makeId('work');
          let coverDataUrl: string | null = null;
          const chapters: Chapter[] = [];

          for (const chPlan of plan.chapters) {
            const chId = makeId('ch');
            const pages: PageRef[] = [];
            for (let idx = 0; idx < chPlan.pages.length; idx++) {
              const pg = chPlan.pages[idx];
              const pBlob = extractedBlobs.get(pg.payloadRef)!;
              const blobId = makeId('pgblob');
              await saveBlob({
                id: blobId,
                workId: wId,
                kind: 'page',
                mimeType: pg.mimeType,
                sizeBytes: pBlob.size,
                blob: pBlob,
                createdAt: Date.now(),
              });
              if (!coverDataUrl) {
                coverDataUrl = await createThumbnailDataUrl(pBlob);
              }
              pages.push({
                id: makeId('pg'),
                name: pg.fileName,
                orderIndex: idx,
                mimeType: pg.mimeType,
                sizeBytes: pBlob.size,
                blobId,
              });
            }
            chapters.push({
              id: chId,
              workId: wId,
              title: chPlan.title,
              orderIndex: chPlan.orderIndex,
              chapterNumber: chPlan.chapterNumber,
              pageCount: pages.length,
              totalBytes: pages.reduce((a, b) => a + b.sizeBytes, 0),
              pages,
            });
          }

          const work: Work = {
            id: wId,
            title: plan.title,
            author: '',
            description: `Importado de ${inp.file.name}`,
            category: plan.category,
            contentKind: 'images',
            formatLabel: detected.toUpperCase(),
            coverDataUrl,
            chapterCount: chapters.length,
            pageCount: chapters.reduce((a, c) => a + c.pageCount, 0),
            totalBytes: inp.file.size,
            isFavorite: false,
            collectionIds: [],
            importedAt: Date.now(),
            updatedAt: Date.now(),
            sourceName: inp.file.name,
          };
          await saveChapters(chapters);
          await saveWork(work);
          createdWorks.push(work);
        }

        job.status = 'done';
        job.progress = 100;
        job.stage = 'Concluído';
        notify();
        continue;
      }

      if (detected === 'epub') {
        job.stage = 'Processando livro EPUB';
        job.progress = 60;
        notify();

        const epub = await parseEpubFromFile(inp.file);
        const wId = makeId('work');
        const chapters: Chapter[] = epub.chapters.map((ch, idx) => ({
          id: makeId('ch'),
          workId: wId,
          title: ch.title,
          orderIndex: idx,
          chapterNumber: extractChapterNumber(ch.title) ?? idx + 1,
          pageCount: 1,
          totalBytes: ch.htmlOrText.length,
          pages: [],
          textContent: ch,
        }));

        const docBlobId = makeId('doc');
        await saveBlob({
          id: docBlobId,
          workId: wId,
          kind: 'document',
          mimeType: mimeTypeForDetected('epub'),
          sizeBytes: inp.file.size,
          blob: inp.file,
          createdAt: Date.now(),
        });

        const work: Work = {
          id: wId,
          title: epub.title,
          author: epub.author,
          description: epub.description,
          category: options.preferredCategory ?? 'livros',
          contentKind: 'book',
          formatLabel: 'EPUB',
          coverDataUrl: epub.coverDataUrl,
          chapterCount: chapters.length,
          pageCount: chapters.length,
          totalBytes: inp.file.size,
          isFavorite: false,
          collectionIds: [],
          importedAt: Date.now(),
          updatedAt: Date.now(),
          sourceName: inp.file.name,
          documentBlobId: docBlobId,
        };
        await saveChapters(chapters);
        await saveWork(work);
        createdWorks.push(work);

        job.status = 'done';
        job.progress = 100;
        job.stage = 'Concluído';
        job.workTitle = work.title;
        notify();
        continue;
      }

      if (detected === 'pdf') {
        job.stage = 'Renderizando capa PDF';
        job.progress = 60;
        notify();

        const {pageCount, coverDataUrl} = await renderPdfCoverAndCount(inp.file);
        const wId = makeId('work');
        const docBlobId = makeId('doc');
        await saveBlob({
          id: docBlobId,
          workId: wId,
          kind: 'document',
          mimeType: 'application/pdf',
          sizeBytes: inp.file.size,
          blob: inp.file,
          createdAt: Date.now(),
        });

        const chapter: Chapter = {
          id: makeId('ch'),
          workId: wId,
          title: 'Documento Completo',
          orderIndex: 0,
          chapterNumber: 1,
          pageCount,
          totalBytes: inp.file.size,
          pages: [],
        };

        const work: Work = {
          id: wId,
          title: sanitizeFileName(inp.file.name.replace(/\.pdf$/i, '')).replace(/_+/g, ' '),
          author: '',
          description: `Documento PDF local com ${pageCount} páginas.`,
          category: options.preferredCategory ?? 'pdfs',
          contentKind: 'pdf',
          formatLabel: 'PDF',
          coverDataUrl,
          chapterCount: 1,
          pageCount,
          totalBytes: inp.file.size,
          isFavorite: false,
          collectionIds: [],
          importedAt: Date.now(),
          updatedAt: Date.now(),
          sourceName: inp.file.name,
          documentBlobId: docBlobId,
        };

        await saveChapters([chapter]);
        await saveWork(work);
        createdWorks.push(work);

        job.status = 'done';
        job.progress = 100;
        job.stage = 'Concluído';
        job.workTitle = work.title;
        notify();
        continue;
      }

      if (
        detected === 'txt' ||
        detected === 'rtf' ||
        detected === 'docx' ||
        detected === 'odt'
      ) {
        job.stage = `Processando ${detected.toUpperCase()}`;
        job.progress = 65;
        notify();

        const baseTitle = sanitizeFileName(
          inp.file.name.replace(/\.(txt|md|rtf|docx|odt)$/i, ''),
        ).replace(/_+/g, ' ');
        let parsedChapters: BookChapterContent[] = [];

        if (detected === 'txt') {
          const text = await inp.file.text();
          parsedChapters = parsePlainTextBook(text, baseTitle);
        } else if (detected === 'rtf') {
          const text = await inp.file.text();
          parsedChapters = parsePlainTextBook(parseRtfToText(text), baseTitle);
        } else {
          parsedChapters = await parseDocxOrOdt(inp.file, detected);
        }

        const wId = makeId('work');
        const docBlobId = makeId('doc');
        await saveBlob({
          id: docBlobId,
          workId: wId,
          kind: 'document',
          mimeType: mimeTypeForDetected(detected),
          sizeBytes: inp.file.size,
          blob: inp.file,
          createdAt: Date.now(),
        });

        const chapters: Chapter[] = parsedChapters.map((ch, idx) => ({
          id: makeId('ch'),
          workId: wId,
          title: ch.title,
          orderIndex: idx,
          chapterNumber: extractChapterNumber(ch.title) ?? idx + 1,
          pageCount: 1,
          totalBytes: ch.htmlOrText.length,
          pages: [],
          textContent: ch,
        }));

        const work: Work = {
          id: wId,
          title: baseTitle,
          author: '',
          description: `Documento ${detected.toUpperCase()} importado localmente.`,
          category:
            options.preferredCategory ??
            (detected === 'txt' ? 'livros' : 'documentos'),
          contentKind: 'book',
          formatLabel: detected.toUpperCase(),
          coverDataUrl: null,
          chapterCount: chapters.length,
          pageCount: chapters.length,
          totalBytes: inp.file.size,
          isFavorite: false,
          collectionIds: [],
          importedAt: Date.now(),
          updatedAt: Date.now(),
          sourceName: inp.file.name,
          documentBlobId: docBlobId,
        };

        await saveChapters(chapters);
        await saveWork(work);
        createdWorks.push(work);

        job.status = 'done';
        job.progress = 100;
        job.stage = 'Concluído';
        job.workTitle = work.title;
        notify();
        continue;
      }

      throw new Error(`Formato não suportado (${inp.file.name}).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido ao importar.';
      job.status = 'error';
      job.stage = 'Falha';
      job.errorMessage = msg;
      errors.push(`${inp.file.name}: ${msg}`);
      notify();
    }
  }

  // Process grouped loose images / folders
  if (looseImages.length > 0) {
    try {
      const totalImgBytes = looseImages.reduce((acc, l) => acc + l.item.file.size, 0);
      await checkQuotaAllows(totalImgBytes);

      const fileMap = new Map<string, {file: File; detected: DetectedFileType}>();
      const rawEntries: RawImageEntry[] = looseImages.map((l, idx) => {
        const key = `img_${idx}_${l.item.relativePath}`;
        fileMap.set(key, {file: l.item.file, detected: l.detected});
        return {
          relativePath: l.item.relativePath || l.item.file.name,
          fileName: l.item.file.name,
          sizeBytes: l.item.file.size,
          mimeType: mimeTypeForDetected(l.detected),
          payloadRef: key,
        };
      });

      const firstPath = looseImages[0].item.relativePath;
      const defaultTitle =
        options.targetWorkTitle ||
        (firstPath.includes('/')
          ? firstPath.split('/')[0]
          : looseImages[0].item.file.name.replace(/\.[^.]+$/, ''));

      const plans = organizeImageEntries(
        rawEntries,
        defaultTitle,
        options.preferredCategory,
      );

      for (const plan of plans) {
        const wId = makeId('work');
        let coverDataUrl: string | null = null;
        let totalWorkBytes = 0;
        const chapters: Chapter[] = [];

        for (const chPlan of plan.chapters) {
          const chId = makeId('ch');
          const pages: PageRef[] = [];
          for (let pIdx = 0; pIdx < chPlan.pages.length; pIdx++) {
            const pg = chPlan.pages[pIdx];
            const source = fileMap.get(pg.payloadRef)!;
            const blobId = makeId('pgblob');
            const dims = await readImageDimensions(source.file);
            await saveBlob({
              id: blobId,
              workId: wId,
              kind: 'page',
              mimeType: pg.mimeType,
              sizeBytes: source.file.size,
              blob: source.file,
              createdAt: Date.now(),
            });
            totalWorkBytes += source.file.size;
            if (!coverDataUrl) {
              coverDataUrl = await createThumbnailDataUrl(source.file);
            }
            pages.push({
              id: makeId('pg'),
              name: pg.fileName,
              orderIndex: pIdx,
              mimeType: pg.mimeType,
              sizeBytes: source.file.size,
              blobId,
              width: dims?.width,
              height: dims?.height,
            });
          }
          chapters.push({
            id: chId,
            workId: wId,
            title: chPlan.title,
            orderIndex: chPlan.orderIndex,
            chapterNumber: chPlan.chapterNumber,
            pageCount: pages.length,
            totalBytes: pages.reduce((a, b) => a + b.sizeBytes, 0),
            pages,
          });
        }

        // Detect webtoon/manhwa vertical ratio from first image if category wasn't explicitly set
        let detectedCategory = plan.category;
        if (!options.preferredCategory && chapters[0]?.pages[0]) {
          const firstPg = chapters[0].pages[0];
          if (firstPg.width && firstPg.height && firstPg.height / firstPg.width > 1.85) {
            detectedCategory = 'manhwas';
          } else {
            detectedCategory = inferCategoryFromHint(plan.title);
          }
        }

        let uniqueTitle = plan.title;
        if (existingTitles.has(uniqueTitle.toLocaleLowerCase('pt-BR'))) {
          uniqueTitle = `${uniqueTitle} (Cópia)`;
        }
        existingTitles.add(uniqueTitle.toLocaleLowerCase('pt-BR'));

        const work: Work = {
          id: wId,
          title: uniqueTitle,
          author: '',
          description: `${chapters.length} capítulo${chapters.length === 1 ? '' : 's'} · ${chapters.reduce((a, c) => a + c.pageCount, 0)} páginas importadas localmente.`,
          category: detectedCategory,
          contentKind: 'images',
          formatLabel: 'IMG',
          coverDataUrl,
          chapterCount: chapters.length,
          pageCount: chapters.reduce((a, c) => a + c.pageCount, 0),
          totalBytes: totalWorkBytes,
          isFavorite: false,
          collectionIds: [],
          importedAt: Date.now(),
          updatedAt: Date.now(),
          sourceName: defaultTitle,
        };

        await saveChapters(chapters);
        await saveWork(work);
        createdWorks.push(work);
      }

      for (const l of looseImages) {
        jobs[l.jobIdx].status = 'done';
        jobs[l.jobIdx].progress = 100;
        jobs[l.jobIdx].stage = 'Organizado';
      }
      notify();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao organizar imagens.';
      errors.push(msg);
      for (const l of looseImages) {
        jobs[l.jobIdx].status = 'error';
        jobs[l.jobIdx].stage = 'Erro';
        jobs[l.jobIdx].errorMessage = msg;
      }
      notify();
    }
  }

  return {createdWorks, errors};
}

/**
 * Recursively traverses dropped DataTransferItemList directories/files
 * so dragging entire manga/manhwa folders preserves folder hierarchy!
 */
export async function collectDroppedEntries(
  items: DataTransferItemList,
): Promise<ImportedFileWithPath[]> {
  const result: ImportedFileWithPath[] = [];

  async function walkEntry(entry: FileSystemEntry, prefix: string): Promise<void> {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      result.push({
        file,
        relativePath: prefix ? `${prefix}/${file.name}` : file.name,
      });
    } else if (entry.isDirectory) {
      const dirReader = (entry as FileSystemDirectoryEntry).createReader();
      const entries: FileSystemEntry[] = [];
      while (true) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        });
        if (batch.length === 0) break;
        entries.push(...batch);
      }
      entries.sort((a, b) => compareNatural(a.name, b.name));
      const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
      for (const child of entries) {
        await walkEntry(child, nextPrefix);
      }
    }
  }

  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.();
    if (entry) {
      await walkEntry(entry, '');
    } else {
      const f = items[i].getAsFile();
      if (f) result.push({file: f, relativePath: f.name});
    }
  }

  return result;
}
