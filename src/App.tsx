import React, {useCallback, useEffect, useState} from 'react';
import {WifiOff} from 'lucide-react';
import {BackupView} from './components/BackupView';
import {CollectionsView} from './components/CollectionsView';
import {DashboardHome} from './components/DashboardHome';
import {FavoritesView, HistoryView} from './components/FavoritesHistoryView';
import {GothicBackgroundRoses} from './components/GothicDecorations';
import {ImportView} from './components/ImportView';
import {LibraryView} from './components/LibraryView';
import {LockScreen} from './components/LockScreen';
import {PersonalizationView} from './components/PersonalizationView';
import {BookReader} from './components/Readers/BookReader';
import {ImageChapterReader} from './components/Readers/ImageChapterReader';
import {PdfReader} from './components/Readers/PdfReader';
import {SecurityView} from './components/SecurityView';
import {SettingsView} from './components/SettingsView';
import {Sidebar} from './components/Sidebar';
import {StorageManagerView} from './components/StorageManagerView';
import {TopBar} from './components/TopBar';
import {WorkDetailModal} from './components/WorkDetailModal';
import {useOnlineStatus} from './hooks/usePWAInstall';
import {
  clearHistory,
  DEFAULT_BOOK_READER_PREFS,
  DEFAULT_IMAGE_READER_PREFS,
  DEFAULT_SECURITY_SETTINGS,
  DEFAULT_STORAGE_SETTINGS,
  DEFAULT_THEME_CONFIG,
  DEFAULT_USER_PROFILE,
  deleteCollection,
  deleteWorkCompletely,
  getAllCollections,
  getAllHistory,
  getAllProgress,
  getAllWorks,
  getBlob,
  getChaptersByWork,
  getDB,
  getSetting,
  pushHistoryEntry,
  saveCollection,
  saveProgress,
  saveWork,
  setSetting,
} from './services/db';
import {createThumbnailDataUrl} from './services/thumbnails';
import type {
  BookReaderPreferences,
  Chapter,
  Collection,
  HistoryEntry,
  ImageReaderPreferences,
  NavSection,
  ReadingProgress,
  SecuritySettings,
  StorageSettings,
  ThemeConfig,
  UserProfile,
  Work,
  WorkCategory,
} from './types/ebookfy';
import {applyThemeToDocument} from './utils/themes';

export default function App() {
  const isOnline = useOnlineStatus();

  const [ready, setReady] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>('inicio');
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState<
    WorkCategory | 'todos'
  >('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [works, setWorks] = useState<Work[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({});
  const [collections, setCollections] = useState<Collection[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [inspectingWork, setInspectingWork] = useState<Work | null>(null);

  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [imagePrefs, setImagePrefs] = useState<ImageReaderPreferences>(
    DEFAULT_IMAGE_READER_PREFS,
  );
  const [bookPrefs, setBookPrefs] = useState<BookReaderPreferences>(
    DEFAULT_BOOK_READER_PREFS,
  );
  const [storageSettings, setStorageSettings] = useState<StorageSettings>(
    DEFAULT_STORAGE_SETTINGS,
  );
  const [security, setSecurity] = useState<SecuritySettings>(
    DEFAULT_SECURITY_SETTINGS,
  );
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isLocked, setIsLocked] = useState(false);

  // Active reader state
  const [activeReader, setActiveReader] = useState<{
    work: Work;
    chapters: Chapter[];
    initialChapterIndex: number;
  } | null>(null);

  const loadAllLocalData = useCallback(async () => {
    const [
      loadedWorks,
      loadedProgress,
      loadedCollections,
      loadedHistory,
      loadedTheme,
      loadedImgPrefs,
      loadedBookPrefs,
      loadedStorage,
      loadedSecurity,
      loadedProfile,
    ] = await Promise.all([
      getAllWorks(),
      getAllProgress(),
      getAllCollections(),
      getAllHistory(),
      getSetting('themeConfig', DEFAULT_THEME_CONFIG),
      getSetting('imageReaderPrefs', DEFAULT_IMAGE_READER_PREFS),
      getSetting('bookReaderPrefs', DEFAULT_BOOK_READER_PREFS),
      getSetting('storageSettings', DEFAULT_STORAGE_SETTINGS),
      getSetting('securitySettings', DEFAULT_SECURITY_SETTINGS),
      getSetting('userProfile', DEFAULT_USER_PROFILE),
    ]);

    setWorks(loadedWorks);
    const pMap: Record<string, ReadingProgress> = {};
    for (const p of loadedProgress) pMap[p.workId] = p;
    setProgressMap(pMap);
    setCollections(loadedCollections);
    setHistory(loadedHistory);
    setThemeConfig(loadedTheme);
    applyThemeToDocument(loadedTheme);
    setImagePrefs(loadedImgPrefs);
    setBookPrefs(loadedBookPrefs);
    setStorageSettings(loadedStorage);
    setSecurity(loadedSecurity);
    setUserProfile(loadedProfile);

    // Require password only on fresh session launch if enabled
    if (
      loadedSecurity.lockEnabled &&
      sessionStorage.getItem('ebookfy_unlocked') !== '1'
    ) {
      setIsLocked(true);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    loadAllLocalData();
  }, [loadAllLocalData]);

  // Optional inactivity auto-lock timer
  useEffect(() => {
    if (!security.lockEnabled || security.inactivityMinutes <= 0 || isLocked) {
      return;
    }
    let timer = window.setTimeout(() => {
      sessionStorage.removeItem('ebookfy_unlocked');
      setIsLocked(true);
    }, security.inactivityMinutes * 60_000);

    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        sessionStorage.removeItem('ebookfy_unlocked');
        setIsLocked(true);
      }, security.inactivityMinutes * 60_000);
    };

    window.addEventListener('pointerdown', resetTimer);
    window.addEventListener('keydown', resetTimer);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [security.lockEnabled, security.inactivityMinutes, isLocked]);

  const handleNavigate = (section: NavSection, catFilter?: WorkCategory) => {
    setActiveSection(section);
    if (catFilter) {
      setLibraryCategoryFilter(catFilter);
    } else if (section === 'biblioteca' && activeSection !== 'biblioteca') {
      setLibraryCategoryFilter('todos');
    }
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (q.trim() && activeSection === 'inicio') {
      setActiveSection('biblioteca');
    }
  };

  const handleOpenReader = async (work: Work, explicitChapterIndex?: number) => {
    const chapters = await getChaptersByWork(work.id);
    if (chapters.length === 0) return;

    const prog = progressMap[work.id];
    const startIdx = explicitChapterIndex ?? prog?.lastChapterIndex ?? 0;
    const targetChapter = chapters[startIdx] ?? chapters[0];

    // Automatically select appropriate default image mode for manhwas/webtoons vs mangas
    if (work.contentKind === 'images') {
      const preferVertical =
        work.category === 'manhwas' || work.category === 'webtoons';
      if (preferVertical && imagePrefs.mode !== 'vertical') {
        const nextPrefs = {...imagePrefs, mode: 'vertical' as const};
        setImagePrefs(nextPrefs);
        await setSetting('imageReaderPrefs', nextPrefs);
      }
    }

    const histEntry: HistoryEntry = {
      id: `hist_${work.id}`,
      workId: work.id,
      chapterId: targetChapter.id,
      chapterTitle: targetChapter.title,
      openedAt: Date.now(),
      percentComplete: prog?.percentComplete ?? 0,
    };
    await pushHistoryEntry(histEntry);
    setHistory(await getAllHistory());
    setSelectedWork(work);

    setActiveReader({
      work,
      chapters,
      initialChapterIndex: startIdx,
    });
  };

  const handleSaveReaderProgress = useCallback(
    async (
      workId: string,
      update: {
        chapterId: string;
        chapterIndex: number;
        pageIndex: number;
        scrollRatio: number;
        percentComplete: number;
        markChapterDone?: boolean;
      },
    ) => {
      const existing = progressMap[workId];
      const completed = new Set(existing?.completedChapterIds ?? []);
      if (update.markChapterDone) completed.add(update.chapterId);

      const next: ReadingProgress = {
        workId,
        lastChapterId: update.chapterId,
        lastChapterIndex: update.chapterIndex,
        lastPageIndex: update.pageIndex,
        scrollRatio: update.scrollRatio,
        percentComplete: update.percentComplete,
        completedChapterIds: Array.from(completed),
        status:
          update.percentComplete >= 99
            ? 'concluido'
            : update.percentComplete > 0
              ? 'em_andamento'
              : 'nao_iniciado',
        lastReadAt: Date.now(),
      };

      setProgressMap((prev) => ({...prev, [workId]: next}));
      await saveProgress(next);
    },
    [progressMap],
  );

  const handleToggleFavorite = async (work: Work) => {
    const updated = {...work, isFavorite: !work.isFavorite};
    await saveWork(updated);
    setWorks((prev) => prev.map((w) => (w.id === work.id ? updated : w)));
    if (selectedWork?.id === work.id) setSelectedWork(updated);
    if (inspectingWork?.id === work.id) setInspectingWork(updated);
  };

  const handleDeleteWorks = async (workIds: string[]) => {
    for (const id of workIds) {
      await deleteWorkCompletely(id);
    }
    if (selectedWork && workIds.includes(selectedWork.id)) {
      setSelectedWork(null);
    }
    await loadAllLocalData();
  };

  const handleAssignCollection = async (workIds: string[], collectionId: string) => {
    for (const id of workIds) {
      const w = works.find((x) => x.id === id);
      if (w && !w.collectionIds.includes(collectionId)) {
        await saveWork({
          ...w,
          collectionIds: [...w.collectionIds, collectionId],
        });
      }
    }
    await loadAllLocalData();
  };

  const handleRegenerateThumbnails = async (): Promise<number> => {
    let count = 0;
    for (const w of works) {
      if (w.contentKind === 'images' && !w.coverDataUrl) {
        const chs = await getChaptersByWork(w.id);
        const firstPage = chs[0]?.pages[0];
        if (firstPage?.blobId) {
          const rec = await getBlob(firstPage.blobId);
          if (rec) {
            const url = await createThumbnailDataUrl(rec.blob);
            if (url) {
              await saveWork({...w, coverDataUrl: url});
              count++;
            }
          }
        }
      }
    }
    await loadAllLocalData();
    return count;
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#080607] flex items-center justify-center">
        <div className="font-calligraphic text-5xl">
          <span className="text-[#F5EFF1]">Ebook</span>
          <span className="text-[#E5092D]">fy</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex bg-[#080607] text-[#F5EFF1] relative overflow-x-hidden"
      style={{
        backgroundColor: themeConfig.backgroundColor,
        backgroundImage: themeConfig.customWallpaperDataUrl
          ? `linear-gradient(rgba(8,6,7,0.82), rgba(8,6,7,0.88)), url(${themeConfig.customWallpaperDataUrl})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Ambient Gothic Roses Decoration */}
      <GothicBackgroundRoses />

      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={(s) => handleNavigate(s)}
        userProfile={userProfile}
        mobileDrawerOpen={mobileDrawerOpen}
        onToggleMobileDrawer={setMobileDrawerOpen}
      />

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onOpenSection={(s) => handleNavigate(s)}
          onOpenFilterLibrary={() => handleNavigate('biblioteca')}
          onToggleMobileMenu={() => setMobileDrawerOpen(true)}
        />

        <main className="flex-1">
          {activeSection === 'inicio' && (
            <DashboardHome
              works={works}
              progressMap={progressMap}
              selectedWork={selectedWork}
              themeConfig={themeConfig}
              onSelectWork={(w) => setSelectedWork(w)}
              onOpenReader={(w) => handleOpenReader(w)}
              onNavigate={handleNavigate}
            />
          )}

          {activeSection === 'biblioteca' && (
            <LibraryView
              works={works}
              progressMap={progressMap}
              collections={collections}
              searchQuery={searchQuery}
              initialCategory={libraryCategoryFilter}
              onOpenReader={(w) => handleOpenReader(w)}
              onInspectWork={(w) => {
                setSelectedWork(w);
                setInspectingWork(w);
              }}
              onToggleFavorite={handleToggleFavorite}
              onDeleteWorks={handleDeleteWorks}
              onAssignCollection={handleAssignCollection}
              onGoImport={() => handleNavigate('importar')}
            />
          )}

          {activeSection === 'favoritos' && (
            <FavoritesView
              works={works}
              onOpenReader={(w) => handleOpenReader(w)}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {activeSection === 'historico' && (
            <HistoryView
              history={history}
              works={works}
              onOpenReader={(w) => handleOpenReader(w)}
              onClearHistory={async () => {
                await clearHistory();
                setHistory([]);
              }}
            />
          )}

          {activeSection === 'colecoes' && (
            <CollectionsView
              collections={collections}
              works={works}
              onCreateCollection={async (name, description) => {
                const col: Collection = {
                  id: `col_${crypto.randomUUID()}`,
                  name,
                  description,
                  createdAt: Date.now(),
                };
                await saveCollection(col);
                setCollections(await getAllCollections());
              }}
              onDeleteCollection={async (id) => {
                await deleteCollection(id);
                setCollections(await getAllCollections());
              }}
              onOpenReader={(w) => handleOpenReader(w)}
            />
          )}

          {activeSection === 'importar' && (
            <ImportView
              onImportComplete={async (newWorks) => {
                await loadAllLocalData();
                if (newWorks[0]) setSelectedWork(newWorks[0]);
              }}
              onOpenReader={(w) => handleOpenReader(w)}
              onGoLibrary={() => handleNavigate('biblioteca')}
            />
          )}

          {activeSection === 'armazenamento' && (
            <StorageManagerView
              works={works}
              storageSettings={storageSettings}
              onUpdateStorageSettings={async (next) => {
                setStorageSettings(next);
                await setSetting('storageSettings', next);
              }}
              onDeleteWork={(id) => handleDeleteWorks([id])}
              onRegenerateThumbnails={handleRegenerateThumbnails}
            />
          )}

          {activeSection === 'backup' && (
            <BackupView works={works} onRestored={loadAllLocalData} />
          )}

          {activeSection === 'personalizacao' && (
            <PersonalizationView
              themeConfig={themeConfig}
              onUpdateTheme={async (cfg) => {
                setThemeConfig(cfg);
                applyThemeToDocument(cfg);
                await setSetting('themeConfig', cfg);
              }}
            />
          )}

          {activeSection === 'seguranca' && (
            <SecurityView
              security={security}
              onUpdateSecurity={async (sec) => {
                setSecurity(sec);
                await setSetting('securitySettings', sec);
              }}
            />
          )}

          {activeSection === 'configuracoes' && (
            <SettingsView
              profile={userProfile}
              imagePrefs={imagePrefs}
              bookPrefs={bookPrefs}
              onUpdateProfile={async (p) => {
                setUserProfile(p);
                await setSetting('userProfile', p);
              }}
              onUpdateImagePrefs={async (p) => {
                setImagePrefs(p);
                await setSetting('imageReaderPrefs', p);
              }}
              onUpdateBookPrefs={async (p) => {
                setBookPrefs(p);
                await setSetting('bookReaderPrefs', p);
              }}
            />
          )}
        </main>
      </div>

      {/* Work Detail Inspection Modal */}
      {inspectingWork && (
        <WorkDetailModal
          work={inspectingWork}
          progress={progressMap[inspectingWork.id]}
          onClose={() => setInspectingWork(null)}
          onWorkUpdated={async () => {
            await loadAllLocalData();
            const db = await getDB();
            const fresh = await db.get('works', inspectingWork.id);
            setInspectingWork(fresh ?? null);
          }}
          onOpenChapter={(w, idx) => {
            setInspectingWork(null);
            handleOpenReader(w, idx);
          }}
          onResetProgress={async (workId) => {
            const db = await getDB();
            await db.delete('progress', workId);
            await loadAllLocalData();
          }}
          onDeleteWork={(id) => handleDeleteWorks([id])}
        />
      )}

      {/* Specialized Readers */}
      {activeReader && activeReader.work.contentKind === 'images' && (
        <ImageChapterReader
          work={activeReader.work}
          chapters={activeReader.chapters}
          initialChapterIndex={activeReader.initialChapterIndex}
          initialProgress={progressMap[activeReader.work.id]}
          preferences={imagePrefs}
          onUpdatePreferences={async (prefs) => {
            setImagePrefs(prefs);
            await setSetting('imageReaderPrefs', prefs);
          }}
          onSaveProgress={(u) =>
            handleSaveReaderProgress(activeReader.work.id, u)
          }
          onClose={() => setActiveReader(null)}
        />
      )}

      {activeReader && activeReader.work.contentKind === 'book' && (
        <BookReader
          work={activeReader.work}
          chapters={activeReader.chapters}
          initialChapterIndex={activeReader.initialChapterIndex}
          initialProgress={progressMap[activeReader.work.id]}
          preferences={bookPrefs}
          onUpdatePreferences={async (prefs) => {
            setBookPrefs(prefs);
            await setSetting('bookReaderPrefs', prefs);
          }}
          onSaveProgress={(u) =>
            handleSaveReaderProgress(activeReader.work.id, u)
          }
          onClose={() => setActiveReader(null)}
        />
      )}

      {activeReader && activeReader.work.contentKind === 'pdf' && (
        <PdfReader
          work={activeReader.work}
          chapters={activeReader.chapters}
          initialProgress={progressMap[activeReader.work.id]}
          onSaveProgress={(u) =>
            handleSaveReaderProgress(activeReader.work.id, u)
          }
          onClose={() => setActiveReader(null)}
        />
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-16 lg:bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-lg border border-[#650D20] bg-[#100B0E]/95 px-3 py-1.5 text-xs text-[#F5EFF1] shadow-lg">
          <WifiOff className="w-3.5 h-3.5 text-[#E5092D]" />
          <span>Modo Offline — Biblioteca local ativa</span>
        </div>
      )}

      {/* Password Lock Screen */}
      {isLocked && (
        <LockScreen
          security={security}
          onUnlock={() => {
            sessionStorage.setItem('ebookfy_unlocked', '1');
            setIsLocked(false);
          }}
          onRecoveryReset={async () => {
            await setSetting('securitySettings', DEFAULT_SECURITY_SETTINGS);
            setSecurity(DEFAULT_SECURITY_SETTINGS);
          }}
        />
      )}
    </div>
  );
}
