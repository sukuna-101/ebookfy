export type WorkCategory =
  | 'mangas'
  | 'manhwas'
  | 'manhuas'
  | 'webtoons'
  | 'hqs'
  | 'livros'
  | 'pdfs'
  | 'documentos'
  | 'outros';

export type ContentKind = 'images' | 'book' | 'pdf';

export type ReadingStatus = 'nao_iniciado' | 'em_andamento' | 'concluido';

export type NavSection =
  | 'inicio'
  | 'biblioteca'
  | 'favoritos'
  | 'historico'
  | 'colecoes'
  | 'importar'
  | 'armazenamento'
  | 'backup'
  | 'personalizacao'
  | 'seguranca'
  | 'configuracoes';

export type ThemeId =
  | 'gotico'
  | 'dark_romance'
  | 'blood_red'
  | 'pure_black'
  | 'crimson_glass'
  | 'minimal_dark'
  | 'personalizado';

export type ImageReaderMode = 'vertical' | 'single' | 'double' | 'horizontal';
export type ReadingDirection = 'ltr' | 'rtl';
export type ImageFitMode = 'width' | 'height' | 'screen' | 'original';
export type ReaderBgColor = 'black' | 'gray' | 'white';
export type BookThemeMode = 'dark_comfort' | 'light' | 'sepia' | 'gothic';

export interface PageRef {
  id: string;
  name: string;
  orderIndex: number;
  mimeType: string;
  sizeBytes: number;
  /** Either direct blob stored in `blobs` store, or entry inside an archive blob */
  blobId?: string;
  archiveBlobId?: string;
  archiveEntryPath?: string;
  width?: number;
  height?: number;
}

export interface BookChapterContent {
  title: string;
  htmlOrText: string;
  isHtml: boolean;
}

export interface Chapter {
  id: string;
  workId: string;
  title: string;
  orderIndex: number;
  chapterNumber: number | null;
  pageCount: number;
  totalBytes: number;
  pages: PageRef[];
  /** For EPUB/TXT/DOCX/ODT/RTF chapters */
  textContent?: BookChapterContent;
}

export interface Work {
  id: string;
  title: string;
  author: string;
  description: string;
  category: WorkCategory;
  contentKind: ContentKind;
  formatLabel: string;
  coverDataUrl: string | null;
  chapterCount: number;
  pageCount: number;
  totalBytes: number;
  isFavorite: boolean;
  collectionIds: string[];
  importedAt: number;
  updatedAt: number;
  sourceName: string;
  /** If PDF or single document stored as one blob */
  documentBlobId?: string;
  archiveBlobId?: string;
}

export interface ReadingProgress {
  workId: string;
  lastChapterId: string;
  lastChapterIndex: number;
  lastPageIndex: number;
  scrollRatio: number; // 0..1 exact scroll position
  percentComplete: number; // 0..100
  completedChapterIds: string[];
  status: ReadingStatus;
  lastReadAt: number;
}

export interface Bookmark {
  id: string;
  workId: string;
  chapterId: string;
  pageIndex: number;
  scrollRatio: number;
  label: string;
  createdAt: number;
}

export interface Highlight {
  id: string;
  workId: string;
  chapterId: string;
  excerpt: string;
  note: string;
  color: 'crimson' | 'gold' | 'rose';
  createdAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  createdAt: number;
}

export interface HistoryEntry {
  id: string;
  workId: string;
  chapterId: string;
  chapterTitle: string;
  openedAt: number;
  percentComplete: number;
}

export interface ThemeConfig {
  activeTheme: ThemeId;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceOpacity: number; // 0.65..1
  blurIntensity: number; // 0..24
  borderRadius: number; // 8..20
  fontScale: number; // 0.9..1.15
  animationsEnabled: boolean;
  customWallpaperDataUrl: string | null;
}

export interface ImageReaderPreferences {
  mode: ImageReaderMode;
  direction: ReadingDirection;
  fitMode: ImageFitMode;
  bgColor: ReaderBgColor;
  imageWidthPercent: number; // 40..100
  panelGapPx: number; // 0..48
  zoomPercent: number; // 50..250
  brightnessPercent: number; // 50..125
  autoHideControls: boolean;
  continuousScroll: boolean;
}

export interface BookReaderPreferences {
  theme: BookThemeMode;
  fontFamily: 'lora' | 'sans' | 'garamond';
  fontSizePx: number;
  lineHeight: number;
  marginPx: number;
  textAlign: 'left' | 'justify';
}

export interface StorageSettings {
  customQuotaBytes: number; // 0 means unlimited
  autoGenerateThumbnails: boolean;
}

export interface SecuritySettings {
  lockEnabled: boolean;
  passwordHash: string | null;
  passwordSalt: string | null;
  inactivityMinutes: number; // 0 = never
  recoveryCodeHash: string | null;
}

export interface UserProfile {
  name: string;
  tierLabel: string;
  avatarDataUrl: string | null;
}

export interface ImportJobItem {
  id: string;
  fileName: string;
  detectedType: string;
  sizeBytes: number;
  progress: number;
  stage: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  errorMessage?: string;
  workTitle?: string;
}

export interface BackupManifest {
  app: 'Ebookfy';
  version: number;
  createdAt: number;
  includeMedia: boolean;
  workCount: number;
  checksumSha256: string;
}
