import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
  Highlighter,
  List,
  Moon,
  Search,
  Settings2,
  Sun,
  X,
} from 'lucide-react';
import {
  deleteBookmark,
  getBookmarksByWork,
  getHighlightsByWork,
  saveBookmark,
  saveHighlight,
} from '../../services/db';
import type {
  BookReaderPreferences,
  BookThemeMode,
  Bookmark,
  Chapter,
  Highlight,
  ReadingProgress,
  Work,
} from '../../types/ebookfy';

interface BookReaderProps {
  work: Work;
  chapters: Chapter[];
  initialChapterIndex: number;
  initialProgress?: ReadingProgress;
  preferences: BookReaderPreferences;
  onUpdatePreferences: (prefs: BookReaderPreferences) => void;
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

export const BookReader: React.FC<BookReaderProps> = ({
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
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectedExcerpt, setSelectedExcerpt] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);

  const currentChapter = chapters[chapterIdx];

  useEffect(() => {
    getBookmarksByWork(work.id).then(setBookmarks);
    getHighlightsByWork(work.id).then(setHighlights);
  }, [work.id]);

  // Restore exact scroll ratio on open
  useEffect(() => {
    if (restoredRef.current) return;
    const el = scrollRef.current;
    if (
      el &&
      initialProgress &&
      initialProgress.lastChapterIndex === chapterIdx &&
      initialProgress.scrollRatio > 0
    ) {
      window.setTimeout(() => {
        const max = el.scrollHeight - el.clientHeight;
        if (max > 0) el.scrollTop = initialProgress.scrollRatio * max;
        restoredRef.current = true;
      }, 80);
    } else {
      restoredRef.current = true;
    }
  }, [chapterIdx, initialProgress]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || !currentChapter) return;
    const max = Math.max(1, el.scrollHeight - el.clientHeight);
    const ratio = Math.min(1, Math.max(0, el.scrollTop / max));
    const total = Math.max(1, chapters.length);
    const overall = Math.min(100, Math.round(((chapterIdx + ratio) / total) * 100));
    onSaveProgress({
      chapterId: currentChapter.id,
      chapterIndex: chapterIdx,
      pageIndex: chapterIdx,
      scrollRatio: ratio,
      percentComplete: overall,
      markChapterDone: ratio >= 0.9,
    });
  };

  const goChapter = (idx: number) => {
    if (idx < 0 || idx >= chapters.length) return;
    setChapterIdx(idx);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    onSaveProgress({
      chapterId: chapters[idx].id,
      chapterIndex: idx,
      pageIndex: idx,
      scrollRatio: 0,
      percentComplete: Math.round(((idx + 0.05) / Math.max(1, chapters.length)) * 100),
    });
  };

  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLocaleLowerCase('pt-BR');
    if (!q) return [];
    const hits: Array<{chapterIdx: number; title: string; snippet: string}> = [];
    chapters.forEach((ch, idx) => {
      const raw = (ch.textContent?.htmlOrText ?? '').replace(/<[^>]+>/g, ' ');
      const pos = raw.toLocaleLowerCase('pt-BR').indexOf(q);
      if (pos !== -1) {
        const start = Math.max(0, pos - 40);
        const end = Math.min(raw.length, pos + 90);
        hits.push({
          chapterIdx: idx,
          title: ch.title,
          snippet: raw.slice(start, end),
        });
      }
    });
    return hits;
  }, [chapters, searchTerm]);

  const handleAddBookmark = async () => {
    if (!currentChapter) return;
    const el = scrollRef.current;
    const max = el ? Math.max(1, el.scrollHeight - el.clientHeight) : 1;
    const ratio = el ? el.scrollTop / max : 0;
    const bm: Bookmark = {
      id: `bm_${crypto.randomUUID()}`,
      workId: work.id,
      chapterId: currentChapter.id,
      pageIndex: chapterIdx,
      scrollRatio: ratio,
      label: `${currentChapter.title} (${Math.round(ratio * 100)}%)`,
      createdAt: Date.now(),
    };
    await saveBookmark(bm);
    setBookmarks((prev) => [bm, ...prev]);
  };

  const handleCaptureSelection = () => {
    const sel = window.getSelection()?.toString().trim() ?? '';
    setSelectedExcerpt(sel);
  };

  const handleSaveHighlight = async () => {
    if (!selectedExcerpt || !currentChapter) return;
    const hl: Highlight = {
      id: `hl_${crypto.randomUUID()}`,
      workId: work.id,
      chapterId: currentChapter.id,
      excerpt: selectedExcerpt.slice(0, 400),
      note: '',
      color: 'crimson',
      createdAt: Date.now(),
    };
    await saveHighlight(hl);
    setHighlights((prev) => [hl, ...prev]);
    setSelectedExcerpt('');
  };

  // Comfort Dark Mode: Pure Black (#000000) with Crisp White Text (#FFFFFF)
  const themeStyles: Record<BookThemeMode, {bg: string; text: string; bar: string}> = {
    dark_comfort: {
      bg: '#000000',
      text: '#FFFFFF',
      bar: 'bg-[#080808]/95 border-[#291016] text-white',
    },
    light: {
      bg: '#FAF7F2',
      text: '#161415',
      bar: 'bg-[#F3EFE8]/95 border-[#DDD6CC] text-[#161415]',
    },
    sepia: {
      bg: '#F4ECD8',
      text: '#3A2D20',
      bar: 'bg-[#EADFC5]/95 border-[#D1C2A4] text-[#3A2D20]',
    },
    gothic: {
      bg: '#080607',
      text: '#F5EFF1',
      bar: 'bg-[#0E080A]/95 border-[#4A1522] text-[#F5EFF1]',
    },
  };

  const activeStyle = themeStyles[preferences.theme];
  const fontClass =
    preferences.fontFamily === 'lora'
      ? 'font-editorial'
      : preferences.fontFamily === 'garamond'
        ? 'font-garamond'
        : 'font-sans';

  return (
    <div
      style={{backgroundColor: activeStyle.bg, color: activeStyle.text}}
      className="fixed inset-0 z-50 flex flex-col transition-colors duration-200"
    >
      {/* Top Bar */}
      <header
        className={`px-3 sm:px-5 h-13 border-b flex items-center justify-between gap-2 shrink-0 ${activeStyle.bar}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Voltar para a biblioteca"
            className="p-2 rounded-lg hover:bg-black/15"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">{work.title}</div>
            <div className="text-[11px] opacity-75 truncate">
              {currentChapter?.title}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Dark/Light Comfort Toggle */}
          <button
            type="button"
            onClick={() =>
              onUpdatePreferences({
                ...preferences,
                theme:
                  preferences.theme === 'dark_comfort' ? 'light' : 'dark_comfort',
              })
            }
            title="Alternar Preto Conforto / Claro"
            aria-label="Alternar modo claro e escuro de leitura"
            className="p-2 rounded-lg hover:bg-black/15"
          >
            {preferences.theme === 'dark_comfort' || preferences.theme === 'gothic' ? (
              <Sun className="w-4 h-4 text-[#E5092D]" />
            ) : (
              <Moon className="w-4 h-4 text-[#E5092D]" />
            )}
          </button>

          {selectedExcerpt && (
            <button
              type="button"
              onClick={handleSaveHighlight}
              title="Destacar trecho selecionado"
              className="px-2.5 py-1.5 rounded-lg bg-[#E5092D] text-white text-[11px] font-semibold inline-flex items-center gap-1"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Destacar</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAddBookmark}
            aria-label="Adicionar marcador"
            className="p-2 rounded-lg hover:bg-black/15"
          >
            <BookmarkIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen((s) => !s)}
            aria-label="Buscar no livro"
            className="p-2 rounded-lg hover:bg-black/15"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setTocOpen((t) => !t)}
            aria-label="Sumário e marcadores"
            className="p-2 rounded-lg hover:bg-black/15"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen((s) => !s)}
            aria-label="Tipografia e tema do livro"
            className="p-2 rounded-lg hover:bg-black/15"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Reading Canvas */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onMouseUp={handleCaptureSelection}
        onTouchEnd={handleCaptureSelection}
        className="flex-1 overflow-y-auto"
      >
        <article
          style={{
            paddingLeft: `${preferences.marginPx}px`,
            paddingRight: `${preferences.marginPx}px`,
            fontSize: `${preferences.fontSizePx}px`,
            lineHeight: preferences.lineHeight,
            textAlign: preferences.textAlign,
          }}
          className={`max-w-[76ch] mx-auto py-10 ${fontClass}`}
        >
          <h2 className="text-[1.45em] font-semibold mb-6">
            {currentChapter?.title}
          </h2>

          {currentChapter?.textContent?.isHtml ? (
            <div
              className="space-y-4 [&>p]:mb-4 [&>h1]:text-xl [&>h2]:text-lg [&>h1]:font-semibold [&>h2]:font-semibold"
              dangerouslySetInnerHTML={{
                __html: currentChapter.textContent.htmlOrText,
              }}
            />
          ) : (
            <div className="space-y-4 whitespace-pre-wrap">
              {(currentChapter?.textContent?.htmlOrText ?? '')
                .split(/\n{2,}/)
                .map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
            </div>
          )}

          {/* Chapter Navigation */}
          <div className="mt-14 pt-6 border-t border-current/15 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={chapterIdx === 0}
              onClick={() => goChapter(chapterIdx - 1)}
              className="px-4 py-2 rounded-lg border border-current/25 text-xs font-medium disabled:opacity-30"
            >
              ← Capítulo anterior
            </button>
            <span className="text-xs opacity-70 tabular-nums">
              {chapterIdx + 1} / {chapters.length}
            </span>
            <button
              type="button"
              disabled={chapterIdx >= chapters.length - 1}
              onClick={() => goChapter(chapterIdx + 1)}
              className="px-4 py-2 rounded-lg bg-[#E5092D] text-white text-xs font-semibold disabled:opacity-30"
            >
              Próximo capítulo →
            </button>
          </div>
        </article>
      </div>

      {/* Sumário / Marcadores Drawer */}
      {tocOpen && (
        <div className="fixed inset-y-13 left-0 z-40 w-[300px] max-w-[85vw] bg-[#0D090B] text-[#F5EFF1] border-r border-[#4A1522] p-4 overflow-y-auto space-y-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold">Sumário ({chapters.length})</h3>
            <button
              type="button"
              onClick={() => setTocOpen(false)}
              className="p-1 text-[#A89DA2]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {chapters.map((ch, idx) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  goChapter(idx);
                  setTocOpen(false);
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs truncate ${
                  idx === chapterIdx
                    ? 'bg-[#650D20] text-white font-semibold'
                    : 'hover:bg-[#390D18]/60 text-[#D8CFD2]'
                }`}
              >
                {ch.title}
              </button>
            ))}
          </div>

          {bookmarks.length > 0 && (
            <div className="pt-3 border-t border-[#3E3136] space-y-1.5">
              <h4 className="text-xs font-semibold text-[#E5092D]">Marcadores</h4>
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-center justify-between gap-2 text-xs bg-[#140D10] p-2 rounded"
                >
                  <button
                    type="button"
                    onClick={() => {
                      goChapter(bm.pageIndex);
                      setTocOpen(false);
                    }}
                    className="truncate text-left flex-1"
                  >
                    {bm.label}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteBookmark(bm.id);
                      setBookmarks((prev) => prev.filter((x) => x.id !== bm.id));
                    }}
                    className="text-[#A89DA2] hover:text-[#FF173D]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {highlights.length > 0 && (
            <div className="pt-3 border-t border-[#3E3136] space-y-1.5">
              <h4 className="text-xs font-semibold text-[#E5092D]">Destaques</h4>
              {highlights.map((hl) => (
                <div
                  key={hl.id}
                  className="text-[11px] bg-[#140D10] border-l-2 border-[#E5092D] p-2 rounded-r text-[#D8CFD2]"
                >
                  &ldquo;{hl.excerpt}&rdquo;
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Drawer */}
      {searchOpen && (
        <div className="fixed top-14 right-3 z-40 w-[320px] max-w-[92vw] rounded-xl border border-[#650D20] bg-[#0E090B] text-[#F5EFF1] p-4 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Buscar no livro</span>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="text-[#A89DA2]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Digite uma palavra ou trecho..."
            className="w-full h-9 px-3 rounded-lg bg-[#140C0F] border border-[#3E3136] text-xs"
          />
          <div className="max-h-56 overflow-y-auto space-y-1.5">
            {searchResults.map((hit, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  goChapter(hit.chapterIdx);
                  setSearchOpen(false);
                }}
                className="w-full text-left p-2 rounded-lg bg-[#140C0F] hover:border-[#E5092D] border border-transparent text-[11px]"
              >
                <div className="font-semibold text-[#E5092D]">{hit.title}</div>
                <div className="text-[#D8CFD2] line-clamp-2 mt-0.5">
                  ...{hit.snippet}...
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Typography & Theme Settings Drawer */}
      {settingsOpen && (
        <div className="fixed top-14 right-3 z-40 w-[300px] max-w-[92vw] rounded-xl border border-[#650D20] bg-[#0E090B] text-[#F5EFF1] p-4 space-y-3.5 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Conforto de Leitura</span>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="text-[#A89DA2]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <div className="text-[11px] text-[#A89DA2] mb-1.5">Tema da Página</div>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  {id: 'dark_comfort', label: 'Preto / Branco'},
                  {id: 'light', label: 'Claro'},
                  {id: 'sepia', label: 'Sépia'},
                  {id: 'gothic', label: 'Gótico'},
                ] as Array<{id: BookThemeMode; label: string}>
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onUpdatePreferences({...preferences, theme: t.id})}
                  className={`py-1.5 px-2 rounded-lg text-[11px] border ${
                    preferences.theme === t.id
                      ? 'border-[#E5092D] bg-[#650D20] text-white'
                      : 'border-[#3E3136] bg-[#140C0F]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-[#A89DA2] mb-1.5">Fonte</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                {id: 'lora', label: 'Lora'},
                {id: 'sans', label: 'Moderna'},
                {id: 'garamond', label: 'Garamond'},
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({
                      ...preferences,
                      fontFamily: f.id as 'lora' | 'sans' | 'garamond',
                    })
                  }
                  className={`py-1.5 rounded-lg text-[11px] border ${
                    preferences.fontFamily === f.id
                      ? 'border-[#E5092D] bg-[#650D20] text-white'
                      : 'border-[#3E3136]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-[11px]">
            <div className="flex justify-between mb-1">
              <span>Tamanho da fonte</span>
              <span className="tabular-nums">{preferences.fontSizePx} px</span>
            </div>
            <input
              type="range"
              min={14}
              max={28}
              value={preferences.fontSizePx}
              onChange={(e) =>
                onUpdatePreferences({
                  ...preferences,
                  fontSizePx: Number(e.target.value),
                })
              }
              className="w-full accent-[#E5092D]"
            />
          </label>

          <label className="block text-[11px]">
            <div className="flex justify-between mb-1">
              <span>Espaçamento entre linhas</span>
              <span className="tabular-nums">{preferences.lineHeight.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={1.3}
              max={2.2}
              step={0.05}
              value={preferences.lineHeight}
              onChange={(e) =>
                onUpdatePreferences({
                  ...preferences,
                  lineHeight: Number(e.target.value),
                })
              }
              className="w-full accent-[#E5092D]"
            />
          </label>

          <label className="block text-[11px]">
            <div className="flex justify-between mb-1">
              <span>Margens laterais</span>
              <span className="tabular-nums">{preferences.marginPx} px</span>
            </div>
            <input
              type="range"
              min={12}
              max={72}
              step={4}
              value={preferences.marginPx}
              onChange={(e) =>
                onUpdatePreferences({
                  ...preferences,
                  marginPx: Number(e.target.value),
                })
              }
              className="w-full accent-[#E5092D]"
            />
          </label>
        </div>
      )}
    </div>
  );
};
