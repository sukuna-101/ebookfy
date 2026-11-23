import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Columns,
  Maximize2,
  Minimize2,
  Settings2,
  Sliders,
  X,
} from 'lucide-react';
import {clearPageUrlCache, resolvePageObjectUrl} from '../../services/archiveReader';
import type {
  Chapter,
  ImageFitMode,
  ImageReaderMode,
  ImageReaderPreferences,
  PageRef,
  ReaderBgColor,
  ReadingProgress,
  Work,
} from '../../types/ebookfy';

interface ImageChapterReaderProps {
  work: Work;
  chapters: Chapter[];
  initialChapterIndex: number;
  initialProgress?: ReadingProgress;
  preferences: ImageReaderPreferences;
  onUpdatePreferences: (prefs: ImageReaderPreferences) => void;
  onSaveProgress: (update: {
    chapterId: string;
    chapterIndex: number;
    pageIndex: number;
    scrollRatio: number;
    percentComplete: number;
    markChapterDone?: boolean;
  }) => void;
  onClose: () => void;
}

const LazyMangaPage: React.FC<{
  page: PageRef;
  widthPercent: number;
  zoomPercent: number;
  brightnessPercent: number;
  fitMode: ImageFitMode;
  isVertical: boolean;
  onVisible?: (index: number) => void;
}> = ({
  page,
  widthPercent,
  zoomPercent,
  brightnessPercent,
  fitMode,
  isVertical,
  onVisible,
}) => {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const node = containerRef.current;
    if (!node) return;

    const load = () => {
      resolvePageObjectUrl(page)
        .then((url) => {
          if (!active) return;
          if (url) setSrc(url);
          else setError(true);
        })
        .catch(() => {
          if (active) setError(true);
        });
    };

    if (!isVertical) {
      load();
      return () => {
        active = false;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            load();
            onVisible?.(page.orderIndex);
          }
        }
      },
      {rootMargin: '900px 0px'},
    );
    observer.observe(node);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [page, isVertical, onVisible]);

  const imgStyle: React.CSSProperties = {
    filter: `brightness(${brightnessPercent}%)`,
    transform: zoomPercent !== 100 && !isVertical ? `scale(${zoomPercent / 100})` : undefined,
    transformOrigin: 'center center',
  };

  if (isVertical) {
    return (
      <div
        ref={containerRef}
        data-page-index={page.orderIndex}
        className="w-full flex justify-center"
      >
        <div
          style={{
            width: `${Math.min(100, (widthPercent * zoomPercent) / 100)}%`,
            maxWidth: widthPercent >= 98 ? '100%' : '960px',
          }}
          className="transition-[width] duration-150 flex justify-center"
        >
          {src ? (
            <img
              src={src}
              alt={`Página ${page.orderIndex + 1}`}
              loading="lazy"
              decoding="async"
              style={imgStyle}
              className="w-full h-auto block select-none"
            />
          ) : error ? (
            <div className="w-full py-16 text-center text-xs text-[#A89DA2] border border-[#3E3136] rounded-lg">
              Falha ao decodificar {page.name}
            </div>
          ) : (
            <div className="w-full aspect-[2/3] bg-[#120D0F] animate-pulse rounded" />
          )}
        </div>
      </div>
    );
  }

  const fitClass =
    fitMode === 'height'
      ? 'max-h-[calc(100vh-20px)] w-auto object-contain'
      : fitMode === 'screen'
        ? 'max-h-[calc(100vh-20px)] max-w-full object-contain'
        : fitMode === 'original'
          ? 'max-w-none w-auto h-auto'
          : 'w-full h-auto max-w-[1000px] object-contain';

  return (
    <div ref={containerRef} className="flex items-center justify-center w-full h-full">
      {src ? (
        <img
          src={src}
          alt={`Página ${page.orderIndex + 1}`}
          style={imgStyle}
          className={`${fitClass} select-none`}
        />
      ) : error ? (
        <div className="p-10 text-xs text-[#A89DA2]">
          Erro ao abrir página {page.name}
        </div>
      ) : (
        <div className="w-64 h-96 bg-[#120D0F] animate-pulse rounded-lg" />
      )}
    </div>
  );
};

export const ImageChapterReader: React.FC<ImageChapterReaderProps> = ({
  work,
  chapters,
  initialChapterIndex,
  initialProgress,
  preferences,
  onUpdatePreferences,
  onSaveProgress,
  onClose,
}) => {
  const [chapterIdx, setChapterIdx] = useState(
    Math.min(Math.max(0, initialChapterIndex), Math.max(0, chapters.length - 1)),
  );
  const currentChapter = chapters[chapterIdx];
  const pages = useMemo(() => currentChapter?.pages ?? [], [currentChapter]);

  const [currentPageIdx, setCurrentPageIdx] = useState(() => {
    if (
      initialProgress &&
      initialProgress.lastChapterIndex === initialChapterIndex
    ) {
      return Math.min(
        Math.max(0, initialProgress.lastPageIndex),
        Math.max(0, (chapters[initialChapterIndex]?.pages.length ?? 1) - 1),
      );
    }
    return 0;
  });

  const [hudVisible, setHudVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{x: number; y: number} | null>(null);
  const restoredScrollRef = useRef(false);

  // Set sensible default mode for manhwas/webtoons vs mangas if not overridden
  const isVertical = preferences.mode === 'vertical';

  // Cleanup URL cache on unmount
  useEffect(() => {
    return () => {
      clearPageUrlCache();
    };
  }, []);

  // Preload next 3 pages smoothly
  useEffect(() => {
    const start = currentPageIdx;
    const end = Math.min(pages.length, start + 4);
    for (let i = start; i < end; i++) {
      resolvePageObjectUrl(pages[i]).catch(() => {});
    }
  }, [currentPageIdx, pages]);

  // Restore scroll ratio in vertical mode on initial open
  useEffect(() => {
    if (!isVertical || restoredScrollRef.current) return;
    const el = scrollContainerRef.current;
    if (
      el &&
      initialProgress &&
      initialProgress.lastChapterIndex === chapterIdx &&
      initialProgress.scrollRatio > 0
    ) {
      const timer = window.setTimeout(() => {
        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll > 0) {
          el.scrollTop = initialProgress.scrollRatio * maxScroll;
        }
        restoredScrollRef.current = true;
      }, 220);
      return () => window.clearTimeout(timer);
    }
    restoredScrollRef.current = true;
  }, [isVertical, chapterIdx, initialProgress]);

  const emitProgress = useCallback(
    (pageIdx: number, scrollRatio: number) => {
      if (!currentChapter) return;
      const totalChapters = Math.max(1, chapters.length);
      const totalPagesInCh = Math.max(1, pages.length);
      const chFraction = isVertical
        ? Math.max(scrollRatio, (pageIdx + 1) / totalPagesInCh)
        : (pageIdx + 1) / totalPagesInCh;
      const overall = Math.min(
        100,
        Math.round(((chapterIdx + chFraction) / totalChapters) * 100),
      );
      onSaveProgress({
        chapterId: currentChapter.id,
        chapterIndex: chapterIdx,
        pageIndex: pageIdx,
        scrollRatio,
        percentComplete: overall,
        markChapterDone: chFraction >= 0.92,
      });
    },
    [currentChapter, chapters.length, pages.length, chapterIdx, isVertical, onSaveProgress],
  );

  // Periodic save on page changes
  useEffect(() => {
    if (!isVertical) {
      emitProgress(currentPageIdx, 0);
    }
  }, [currentPageIdx, isVertical, emitProgress]);

  const handleVerticalScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
    const ratio = Math.min(1, Math.max(0, el.scrollTop / maxScroll));
    const estPage = Math.min(
      Math.max(0, pages.length - 1),
      Math.floor(ratio * pages.length),
    );
    setCurrentPageIdx(estPage);
    emitProgress(estPage, ratio);
  };

  const goToChapter = useCallback(
    (nextIdx: number) => {
      if (nextIdx < 0 || nextIdx >= chapters.length) return;
      setChapterIdx(nextIdx);
      setCurrentPageIdx(0);
      restoredScrollRef.current = true;
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    },
    [chapters.length],
  );

  const stepPage = useCallback(
    (delta: number) => {
      const step = preferences.mode === 'double' ? 2 : 1;
      const target = currentPageIdx + delta * step;
      if (target < 0) {
        if (chapterIdx > 0) goToChapter(chapterIdx - 1);
        return;
      }
      if (target >= pages.length) {
        if (chapterIdx < chapters.length - 1) goToChapter(chapterIdx + 1);
        return;
      }
      setCurrentPageIdx(target);
    },
    [preferences.mode, currentPageIdx, chapterIdx, pages.length, chapters.length, goToChapter],
  );

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard shortcuts for Windows/PC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (settingsOpen) setSettingsOpen(false);
        else onClose();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (!isVertical) {
        const dirMult = preferences.direction === 'rtl' ? -1 : 1;
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          stepPage(1 * dirMult);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          stepPage(-1 * dirMult);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVertical, preferences.direction, settingsOpen, stepPage, toggleFullscreen, onClose]);

  const bgClass =
    preferences.bgColor === 'white'
      ? 'bg-white text-neutral-900'
      : preferences.bgColor === 'gray'
        ? 'bg-[#1E1B1D] text-[#F5EFF1]'
        : 'bg-black text-[#F5EFF1]';

  const progressPct =
    pages.length > 0 ? Math.round(((currentPageIdx + 1) / pages.length) * 100) : 0;

  return (
    <div
      ref={rootRef}
      className={`fixed inset-0 z-50 flex flex-col ${bgClass} select-none`}
    >
      {/* Top Minimalist HUD */}
      <header
        className={`fixed top-0 left-0 right-0 z-30 transition-transform duration-200 bg-black/85 backdrop-blur-md border-b border-[#4A1522]/70 px-3 sm:px-5 h-13 flex items-center justify-between gap-2 text-[#F5EFF1] ${
          hudVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Voltar para a biblioteca"
            className="min-h-[38px] min-w-[38px] rounded-lg hover:bg-[#390D18] flex items-center justify-center transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">{work.title}</div>
            <div className="text-[11px] text-[#A89DA2] truncate">
              {currentChapter?.title ?? 'Capítulo'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <select
            aria-label="Selecionar capítulo"
            value={chapterIdx}
            onChange={(e) => goToChapter(Number(e.target.value))}
            className="h-8 max-w-[150px] sm:max-w-[210px] px-2 rounded-lg bg-[#120C0E] border border-[#4A1522] text-xs text-[#F5EFF1]"
          >
            {chapters.map((c, idx) => (
              <option key={c.id} value={idx}>
                {c.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            aria-label="Configurações do leitor"
            className={`min-h-[38px] min-w-[38px] rounded-lg flex items-center justify-center transition ${
              settingsOpen ? 'bg-[#E5092D] text-white' : 'hover:bg-[#390D18]'
            }`}
          >
            <Settings2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Alternar tela cheia"
            className="min-h-[38px] min-w-[38px] rounded-lg hover:bg-[#390D18] flex items-center justify-center transition"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {isVertical ? (
        <div
          ref={scrollContainerRef}
          onScroll={handleVerticalScroll}
          onClick={() => {
            if (!settingsOpen) setHudVisible((v) => !v);
          }}
          className="flex-1 overflow-y-auto overflow-x-hidden py-14"
        >
          <div
            className="mx-auto flex flex-col items-center"
            style={{gap: `${preferences.panelGapPx}px`}}
          >
            {pages.map((pg) => (
              <LazyMangaPage
                key={pg.id}
                page={pg}
                widthPercent={preferences.imageWidthPercent}
                zoomPercent={preferences.zoomPercent}
                brightnessPercent={preferences.brightnessPercent}
                fitMode={preferences.fitMode}
                isVertical={true}
              />
            ))}
          </div>

          {/* End of chapter navigation */}
          <div className="max-w-lg mx-auto px-4 py-10 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={chapterIdx === 0}
              onClick={(e) => {
                e.stopPropagation();
                goToChapter(chapterIdx - 1);
              }}
              className="flex-1 py-3 rounded-xl border border-[#4A1522] bg-[#100B0E] text-[#F5EFF1] text-xs font-semibold disabled:opacity-35 hover:border-[#E5092D]"
            >
              Capítulo Anterior
            </button>
            <button
              type="button"
              disabled={chapterIdx >= chapters.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                goToChapter(chapterIdx + 1);
              }}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#8E0A24] to-[#E5092D] text-white text-xs font-semibold disabled:opacity-35"
            >
              Próximo Capítulo
            </button>
          </div>
        </div>
      ) : (
        /* Single / Double / Horizontal Page Reader */
        <div
          onClick={() => {
            if (!settingsOpen) setHudVisible((v) => !v);
          }}
          onTouchStart={(e) => {
            touchStartRef.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
            };
          }}
          onTouchEnd={(e) => {
            if (!touchStartRef.current) return;
            const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
            const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
              const dirMult = preferences.direction === 'rtl' ? -1 : 1;
              stepPage((dx < 0 ? 1 : -1) * dirMult);
            }
            touchStartRef.current = null;
          }}
          className="flex-1 relative overflow-auto flex items-center justify-center p-2"
        >
          {preferences.mode === 'double' && pages[currentPageIdx + 1] ? (
            <div
              className={`flex items-center justify-center gap-2 max-w-full ${
                preferences.direction === 'rtl' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <LazyMangaPage
                page={pages[currentPageIdx]}
                widthPercent={50}
                zoomPercent={preferences.zoomPercent}
                brightnessPercent={preferences.brightnessPercent}
                fitMode={preferences.fitMode}
                isVertical={false}
              />
              <LazyMangaPage
                page={pages[currentPageIdx + 1]}
                widthPercent={50}
                zoomPercent={preferences.zoomPercent}
                brightnessPercent={preferences.brightnessPercent}
                fitMode={preferences.fitMode}
                isVertical={false}
              />
            </div>
          ) : pages[currentPageIdx] ? (
            <LazyMangaPage
              page={pages[currentPageIdx]}
              widthPercent={preferences.imageWidthPercent}
              zoomPercent={preferences.zoomPercent}
              brightnessPercent={preferences.brightnessPercent}
              fitMode={preferences.fitMode}
              isVertical={false}
            />
          ) : null}

          {/* Side tap / click navigation buttons */}
          <button
            type="button"
            aria-label="Página anterior"
            onClick={(e) => {
              e.stopPropagation();
              stepPage(preferences.direction === 'rtl' ? 1 : -1);
            }}
            className="fixed left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-14 rounded-xl bg-black/50 hover:bg-[#650D20]/80 text-white flex items-center justify-center transition opacity-75 hover:opacity-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            aria-label="Próxima página"
            onClick={(e) => {
              e.stopPropagation();
              stepPage(preferences.direction === 'rtl' ? -1 : 1);
            }}
            className="fixed right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-14 rounded-xl bg-black/50 hover:bg-[#650D20]/80 text-white flex items-center justify-center transition opacity-75 hover:opacity-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Bottom Progress Bar */}
      <footer
        className={`fixed bottom-0 left-0 right-0 z-30 transition-transform duration-200 bg-black/85 backdrop-blur-md border-t border-[#4A1522]/70 px-4 py-2.5 text-[#F5EFF1] ${
          hudVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            type="button"
            disabled={chapterIdx === 0}
            onClick={() => goToChapter(chapterIdx - 1)}
            className="px-2.5 py-1 rounded border border-[#4A1522] text-[11px] disabled:opacity-35"
          >
            Cap. Ant
          </button>
          <input
            type="range"
            aria-label="Navegar páginas"
            min={0}
            max={Math.max(0, pages.length - 1)}
            value={currentPageIdx}
            onChange={(e) => {
              const idx = Number(e.target.value);
              setCurrentPageIdx(idx);
              if (isVertical && scrollContainerRef.current && pages.length > 1) {
                const maxScroll =
                  scrollContainerRef.current.scrollHeight -
                  scrollContainerRef.current.clientHeight;
                scrollContainerRef.current.scrollTop =
                  (idx / (pages.length - 1)) * maxScroll;
              }
            }}
            className="flex-1 accent-[#E5092D]"
          />
          <span className="text-xs tabular-nums whitespace-nowrap">
            {currentPageIdx + 1} / {pages.length} ({progressPct}%)
          </span>
          <button
            type="button"
            disabled={chapterIdx >= chapters.length - 1}
            onClick={() => goToChapter(chapterIdx + 1)}
            className="px-2.5 py-1 rounded border border-[#4A1522] text-[11px] disabled:opacity-35"
          >
            Próx. Cap
          </button>
        </div>
      </footer>

      {/* Reader Customization Drawer */}
      {settingsOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed top-14 right-3 z-40 w-[310px] max-w-[92vw] rounded-xl border border-[#650D20] bg-[#0E090B]/95 backdrop-blur-md p-4 space-y-4 text-[#F5EFF1] shadow-2xl max-h-[80vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#E5092D]" />
              <span>Personalização do Leitor</span>
            </h3>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="p-1 text-[#A89DA2] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Reading Mode */}
          <div>
            <div className="text-[11px] text-[#A89DA2] mb-1.5">Modelo de Leitura</div>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  {id: 'vertical', label: 'Vertical Contínuo'},
                  {id: 'single', label: 'Página Única'},
                  {id: 'double', label: 'Página Dupla'},
                  {id: 'horizontal', label: 'Horizontal'},
                ] as Array<{id: ImageReaderMode; label: string}>
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({...preferences, mode: m.id})
                  }
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition ${
                    preferences.mode === m.id
                      ? 'border-[#E5092D] bg-[#650D20] text-white'
                      : 'border-[#3E3136] bg-[#140E10] text-[#D8CFD2]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div>
            <div className="text-[11px] text-[#A89DA2] mb-1.5">Fundo do Leitor</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  {id: 'black', label: 'Preto'},
                  {id: 'gray', label: 'Cinza'},
                  {id: 'white', label: 'Branco'},
                ] as Array<{id: ReaderBgColor; label: string}>
              ).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({...preferences, bgColor: b.id})
                  }
                  className={`py-1.5 rounded-lg text-[11px] font-medium border ${
                    preferences.bgColor === b.id
                      ? 'border-[#E5092D] bg-[#650D20] text-white'
                      : 'border-[#3E3136] bg-[#140E10] text-[#D8CFD2]'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {!isVertical && (
            <>
              <div>
                <div className="text-[11px] text-[#A89DA2] mb-1.5">
                  Direção de Leitura
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePreferences({...preferences, direction: 'rtl'})
                    }
                    className={`py-1.5 rounded-lg text-[11px] border ${
                      preferences.direction === 'rtl'
                        ? 'border-[#E5092D] bg-[#650D20] text-white'
                        : 'border-[#3E3136]'
                    }`}
                  >
                    Direita → Esquerda (Mangá)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePreferences({...preferences, direction: 'ltr'})
                    }
                    className={`py-1.5 rounded-lg text-[11px] border ${
                      preferences.direction === 'ltr'
                        ? 'border-[#E5092D] bg-[#650D20] text-white'
                        : 'border-[#3E3136]'
                    }`}
                  >
                    Esquerda → Direita (HQ)
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-[#A89DA2] mb-1.5">Ajuste à Tela</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      {id: 'width', label: 'Ajustar Largura'},
                      {id: 'height', label: 'Ajustar Altura'},
                      {id: 'screen', label: 'Ajustar à Tela'},
                      {id: 'original', label: 'Tamanho Original'},
                    ] as Array<{id: ImageFitMode; label: string}>
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        onUpdatePreferences({...preferences, fitMode: f.id})
                      }
                      className={`py-1.5 px-2 rounded-lg text-[11px] border ${
                        preferences.fitMode === f.id
                          ? 'border-[#E5092D] bg-[#650D20] text-white'
                          : 'border-[#3E3136]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Width, Gap, Zoom, Brightness sliders */}
          <div className="space-y-3 text-[11px]">
            <label className="block">
              <div className="flex justify-between text-[#D8CFD2] mb-1">
                <span className="flex items-center gap-1">
                  <Columns className="w-3 h-3 text-[#E5092D]" />
                  Largura das imagens
                </span>
                <span className="tabular-nums">{preferences.imageWidthPercent}%</span>
              </div>
              <input
                type="range"
                min={35}
                max={100}
                value={preferences.imageWidthPercent}
                onChange={(e) =>
                  onUpdatePreferences({
                    ...preferences,
                    imageWidthPercent: Number(e.target.value),
                  })
                }
                className="w-full accent-[#E5092D]"
              />
            </label>

            {isVertical && (
              <label className="block">
                <div className="flex justify-between text-[#D8CFD2] mb-1">
                  <span>Espaçamento entre painéis</span>
                  <span className="tabular-nums">{preferences.panelGapPx} px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={48}
                  value={preferences.panelGapPx}
                  onChange={(e) =>
                    onUpdatePreferences({
                      ...preferences,
                      panelGapPx: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#E5092D]"
                />
              </label>
            )}

            <label className="block">
              <div className="flex justify-between text-[#D8CFD2] mb-1">
                <span>Zoom</span>
                <span className="tabular-nums">{preferences.zoomPercent}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={220}
                step={5}
                value={preferences.zoomPercent}
                onChange={(e) =>
                  onUpdatePreferences({
                    ...preferences,
                    zoomPercent: Number(e.target.value),
                  })
                }
                className="w-full accent-[#E5092D]"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-[#D8CFD2] mb-1">
                <span>Brilho</span>
                <span className="tabular-nums">{preferences.brightnessPercent}%</span>
              </div>
              <input
                type="range"
                min={45}
                max={125}
                step={5}
                value={preferences.brightnessPercent}
                onChange={(e) =>
                  onUpdatePreferences({
                    ...preferences,
                    brightnessPercent: Number(e.target.value),
                  })
                }
                className="w-full accent-[#E5092D]"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
