export type DetectedFileType =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'gif'
  | 'bmp'
  | 'tiff'
  | 'avif'
  | 'zip'
  | 'epub'
  | 'docx'
  | 'odt'
  | 'pdf'
  | 'tar'
  | 'gzip'
  | 'rar'
  | '7z'
  | 'rtf'
  | 'txt'
  | 'unknown';

const EXECUTABLE_OR_SCRIPT_EXTS = new Set([
  'exe',
  'dll',
  'bat',
  'cmd',
  'sh',
  'ps1',
  'msi',
  'vbs',
  'js',
  'mjs',
  'cjs',
  'com',
  'scr',
  'app',
  'apk',
  'jar',
]);

export function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function isImageType(t: DetectedFileType): boolean {
  return (
    t === 'png' ||
    t === 'jpeg' ||
    t === 'webp' ||
    t === 'gif' ||
    t === 'bmp' ||
    t === 'tiff' ||
    t === 'avif'
  );
}

export function mimeTypeForDetected(t: DetectedFileType): string {
  switch (t) {
    case 'png':
      return 'image/png';
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    case 'tiff':
      return 'image/tiff';
    case 'avif':
      return 'image/avif';
    case 'pdf':
      return 'application/pdf';
    case 'epub':
      return 'application/epub+zip';
    case 'zip':
      return 'application/zip';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'odt':
      return 'application/vnd.oasis.opendocument.text';
    case 'rtf':
      return 'application/rtf';
    case 'txt':
      return 'text/plain';
    case 'tar':
      return 'application/x-tar';
    case 'gzip':
      return 'application/gzip';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Inspects magic bytes first to verify real file content rather than trusting extension alone.
 */
export function detectFileTypeFromBytes(
  bytes: Uint8Array,
  filename = '',
): DetectedFileType {
  const ext = getExtension(filename);

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png';
  }

  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  // GIF: GIF87a / GIF89a
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return 'gif';
  }

  // WEBP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }

  // BMP: BM
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return 'bmp';
  }

  // TIFF: II*\0 or MM\0*
  if (
    bytes.length >= 4 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a))
  ) {
    return 'tiff';
  }

  // AVIF: ....ftypavif / ....ftypavis
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69
  ) {
    return 'avif';
  }

  // PDF: %PDF
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return 'pdf';
  }

  // RAR: Rar!
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x61 &&
    bytes[2] === 0x72 &&
    bytes[3] === 0x21
  ) {
    return 'rar';
  }

  // 7z: 37 7A BC AF 27 1C
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x37 &&
    bytes[1] === 0x7a &&
    bytes[2] === 0xbc &&
    bytes[3] === 0xaf &&
    bytes[4] === 0x27 &&
    bytes[5] === 0x1c
  ) {
    return '7z';
  }

  // GZIP: 1F 8B
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    return 'gzip';
  }

  // ZIP / CBZ / EPUB / DOCX / ODT: PK\x03\x04 or PK\x05\x06 (empty zip)
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    ((bytes[2] === 0x03 && bytes[3] === 0x04) || (bytes[2] === 0x05 && bytes[3] === 0x06))
  ) {
    if (ext === 'epub') return 'epub';
    if (ext === 'docx') return 'docx';
    if (ext === 'odt') return 'odt';
    return 'zip';
  }

  // TAR: ustar at offset 257
  if (
    bytes.length >= 263 &&
    bytes[257] === 0x75 &&
    bytes[258] === 0x73 &&
    bytes[259] === 0x74 &&
    bytes[260] === 0x61 &&
    bytes[261] === 0x72
  ) {
    return 'tar';
  }

  // RTF: {\rtf
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x7b &&
    bytes[1] === 0x5c &&
    bytes[2] === 0x72 &&
    bytes[3] === 0x74 &&
    bytes[4] === 0x66
  ) {
    return 'rtf';
  }

  // Plain text heuristic (no null bytes in sample)
  if (ext === 'txt' || ext === 'md') {
    const hasNull = bytes.slice(0, 512).some((b) => b === 0);
    if (!hasNull) return 'txt';
  }

  return 'unknown';
}

/**
 * Rejects path traversal ("../"), absolute paths, control characters, and executable scripts.
 */
export function isSafeArchiveEntryPath(entryPath: string): boolean {
  if (!entryPath || entryPath.includes('\0')) return false;
  const normalized = entryPath.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) return false;
  const segments = normalized.split('/');
  if (segments.some((s) => s === '..' || s === '.')) return false;

  // Ignore macOS AppleDouble / metadata junk safely
  const baseName = segments[segments.length - 1] || '';
  if (!baseName || baseName.startsWith('._') || normalized.includes('__MACOSX/')) {
    return false;
  }

  const ext = getExtension(baseName);
  if (EXECUTABLE_OR_SCRIPT_EXTS.has(ext)) return false;

  return true;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim() || 'Sem_Titulo';
}

/**
 * Checks whether an archive entry shows extreme ZIP-bomb compression ratio or absurd uncompressed size.
 */
export function checkZipBombRisk(
  compressedBytes: number,
  uncompressedBytes: number,
  maxSingleEntryBytes = 512 * 1024 * 1024, // 512 MB per single image/entry guard
  maxRatio = 120,
): {safe: boolean; reason?: string} {
  if (uncompressedBytes > maxSingleEntryBytes) {
    return {safe: false, reason: 'Entrada excede o limite de segurança por arquivo'};
  }
  if (compressedBytes > 0 && uncompressedBytes / compressedBytes > maxRatio && uncompressedBytes > 20 * 1024 * 1024) {
    return {safe: false, reason: 'Taxa de compressão suspeita (proteção anti-ZIP bomb)'};
  }
  return {safe: true};
}
