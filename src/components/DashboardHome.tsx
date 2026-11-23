import React from 'react';
import {
  ArrowRight,
  BookOpen,
  FileText,
  Globe,
  Layers,
  Palette,
  Play,
  Plus,
} from 'lucide-react';
import {THEME_ASSETS} from '../assets/themeAssets';
import type {
  NavSection,
  ReadingProgress,
  ThemeConfig,
  Work,
  WorkCategory,
} from '../types/ebookfy';
import {formatBytes, formatObrasCount} from '../utils/formatters';
import {CATEGORY_META, THEME_PRESETS} from '../utils/themes';
import {GothicCorner} from './GothicDecorations';

interface DashboardHomeProps {
  works: Work[];
  progressMap: Record<string, ReadingProgress>;
  selectedWork: Work | null;
  themeConfig: ThemeConfig;
  onSelectWork: (work: Work) => void;
  onOpenReader: (work: Work) => void;
  onNavigate: (section: NavSection, categoryFilter?: WorkCategory) => void;
}

const HQMaskIcon: React.FC<{className?: string}> = ({className = 'w-6 h-6'}) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 6c2 2 5 2 8 2s6 0 8-2v7c0 4.5-3.5 7.5-8 9-4.5-1.5-8-4.5-8-9V6Z" />
    <path d="M7.5 11.5c1-.8 2.2-.8 3 0" />
    <path d="M13.5 11.5c1-.8 2.2-.8 3 0" />
    <path d="M9.5 16c1.5.8 3.5.8 5 0" />
  </svg>
);

const DASHBOARD_CATEGORIES: Array<{
  id: WorkCategory;
  label: string;
  icon: React.FC<{className?: string}>;
}> = [
  {id: 'mangas', label: 'Mangás', icon: BookOpen},
  {id: 'manhwas', label: 'Manhwas', icon: FileText},
  {id: 'manhuas', label: 'Manhuas', icon: Layers},
  {id: 'webtoons', label: 'Webtoons', icon: Globe},
  {id: 'hqs', label: 'HQs', icon: HQMaskIcon},
];

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  works,
  progressMap,
  selectedWork,
  themeConfig,
  onSelectWork,
  onOpenReader,
  onNavigate,
}) => {
  // Determine most recent in-progress (or most recent imported) work for "Continuar lendo"
  const activeReadingEntry = React.useMemo(() => {
    const entries = Object.values(progressMap)
      .filter((p) => p.lastReadAt > 0)
      .sort((a, b) => b.lastReadAt - a.lastReadAt);

    for (const p of entries) {
      const work = works.find((w) => w.id === p.workId);
      if (work) return {work, progress: p};
    }

    if (works.length > 0) {
      const latest = works[0];
      return {
        work: latest,
        progress: progressMap[latest.id] ?? null,
      };
    }
    return null;
  }, [works, progressMap]);

  const countByCategory = React.useMemo(() => {
    const counts: Record<WorkCategory, number> = {
      mangas: 0,
      manhwas: 0,
      manhuas: 0,
      webtoons: 0,
      hqs: 0,
      livros: 0,
      pdfs: 0,
      documentos: 0,
      outros: 0,
    };
    for (const w of works) {
      counts[w.category] = (counts[w.category] ?? 0) + 1;
    }
    return counts;
  }, [works]);

  const activeThemeLabel =
    themeConfig.activeTheme === 'personalizado'
      ? 'Personalizado'
      : (THEME_PRESETS.find((t) => t.id === themeConfig.activeTheme)?.name ??
        'Gótico');

  const selectedProgress = selectedWork
    ? progressMap[selectedWork.id]
    : undefined;

  return (
    <div className="relative z-10 px-4 sm:px-6 pb-20 lg:pb-6 grid grid-cols-1 xl:grid-cols-[1fr_270px] gap-4 items-start">
      {/* CENTRAL MAIN AREA */}
      <div className="space-y-5 min-w-0">
        {/* HERO BANNER */}
        <section
          aria-label="Destaque Ebookfy"
          className="relative overflow-hidden rounded-xl border border-[#650D20] bg-[#0B0709] min-h-[235px] sm:min-h-[268px] flex flex-col justify-between p-5 sm:p-7 shadow-[0_12px_36px_rgba(0,0,0,0.7)]"
        >
          <img
            src={THEME_ASSETS.bannerGothicCastle}
            alt="Ilustração gótica de castelo sob lua cheia e personagem com rosa vermelha"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-[85%_18%] select-none"
          />
          {/* Left-side gradient scrim ensuring 4.5:1+ contrast for typography */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(8,6,7,0.96) 0%, rgba(8,6,7,0.88) 40%, rgba(8,6,7,0.38) 70%, rgba(8,6,7,0.1) 100%)',
            }}
          />

          <div className="relative z-10 max-w-[360px] mt-1">
            <h1 className="font-calligraphic text-[54px] sm:text-[66px] leading-[0.9] tracking-wide drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
              <span className="text-[#E6DFE2]">Ebook</span>
              <span className="text-[#E5092D]">fy</span>
            </h1>

            <p className="mt-2.5 text-[16px] sm:text-[18px] font-medium tracking-tight text-[#F5EFF1]">
              Sua biblioteca. <span className="text-[#E9A6B2]">Suas</span> regras.
            </p>

            <div className="mt-2.5 flex items-center gap-2.5 text-[11px] text-[#B8AEB2]">
              <span className="w-8 h-[1px] bg-[#A50E2A]" />
              <span>Leia. Organize. Explore.</span>
              <span className="w-8 h-[1px] bg-[#A50E2A]" />
            </div>
          </div>

          <div className="relative z-10 flex justify-end mt-4">
            <button
              type="button"
              onClick={() => onNavigate(works.length > 0 ? 'biblioteca' : 'importar')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#8E0A24] to-[#E5092D] text-white text-[13px] font-semibold border border-[#FF173D]/60 shadow-[0_0_20px_rgba(229,9,45,0.35)] hover:brightness-110 active:scale-[0.98] transition whitespace-nowrap"
            >
              <span>Explorar agora</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* CONTINUAR LENDO */}
        <section aria-label="Continuar lendo">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[17px] font-semibold text-[#F5EFF1] tracking-tight">
              Continuar lendo
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('biblioteca')}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#E6DFE2] hover:text-white transition"
            >
              <span>Ver tudo</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#E5092D]" />
            </button>
          </div>

          {activeReadingEntry ? (
            <div
              onClick={() => onSelectWork(activeReadingEntry.work)}
              className="group cursor-pointer rounded-xl border border-[#8E0A24]/85 bg-[#0C080A]/95 p-3 flex items-center gap-3.5 hover:border-[#FF173D] transition shadow-[0_0_24px_rgba(101,13,32,0.22)]"
            >
              <div className="w-[74px] h-[66px] sm:w-[92px] sm:h-[70px] rounded-lg overflow-hidden border border-[#4A1522] bg-[#160A0E] shrink-0 flex items-center justify-center">
                {activeReadingEntry.work.coverDataUrl ? (
                  <img
                    src={activeReadingEntry.work.coverDataUrl}
                    alt={`Capa de ${activeReadingEntry.work.title}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="w-6 h-6 text-[#E5092D]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-semibold text-[#F5EFF1] truncate">
                  {activeReadingEntry.work.title}
                </h3>
                <p className="text-[12px] text-[#A89DA2] mt-0.5 truncate">
                  {activeReadingEntry.progress
                    ? `Capítulo ${(activeReadingEntry.progress.lastChapterIndex ?? 0) + 1}`
                    : `${activeReadingEntry.work.chapterCount} capítulo${activeReadingEntry.work.chapterCount === 1 ? '' : 's'}`}
                </p>

                <div className="mt-2 flex items-center gap-3 max-w-[300px]">
                  <div className="flex-1 h-1.5 rounded-full bg-[#241A1D] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#A50E2A] to-[#FF173D] transition-all"
                      style={{
                        width: `${activeReadingEntry.progress?.percentComplete ?? 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-[#D8CFD2] tabular-nums">
                    {Math.round(activeReadingEntry.progress?.percentComplete ?? 0)}%
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenReader(activeReadingEntry.work);
                }}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#9E0B27] to-[#E5092D] text-white text-[12px] font-semibold border border-[#FF173D]/50 shadow-[0_0_16px_rgba(229,9,45,0.3)] hover:brightness-110 transition whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Continuar</span>
              </button>
            </div>
          ) : (
            /* Empty library state matching exact Gothic silhouette with 0 preloaded books */
            <div className="rounded-xl border border-[#650D20]/90 bg-[#0C080A]/92 p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_24px_rgba(101,13,32,0.16)]">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-[74px] h-[64px] rounded-lg border border-[#390D18] bg-[#120A0D] shrink-0 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-[#E5092D]/80" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-[#F5EFF1]">
                    Biblioteca vazia — pronto para suas obras
                  </h3>
                  <p className="text-[12px] text-[#A89DA2] mt-0.5 line-clamp-2">
                    Nenhum livro ou manhwa pré-carregado. Adicione seus arquivos ZIP, CBZ, EPUB, PDF ou pastas locais.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('importar')}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#9E0B27] to-[#E5092D] text-white text-[12px] font-semibold border border-[#FF173D]/50 shadow-[0_0_16px_rgba(229,9,45,0.28)] hover:brightness-110 transition whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar arquivos</span>
              </button>
            </div>
          )}
        </section>

        {/* CATEGORIAS */}
        <section aria-label="Categorias">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[17px] font-semibold text-[#F5EFF1] tracking-tight">
              Categorias
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('biblioteca')}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#E6DFE2] hover:text-white transition"
            >
              <span>Ver tudo</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#E5092D]" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {DASHBOARD_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = countByCategory[cat.id] ?? 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onNavigate('biblioteca', cat.id)}
                  className="group rounded-xl border border-[#3E3136]/90 bg-[#0B080A]/92 hover:border-[#E5092D]/80 hover:bg-[#140A0E] py-4 px-3 flex flex-col items-center justify-center text-center transition duration-150"
                >
                  <Icon className="w-6 h-6 text-[#E5092D] mb-2.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[13px] font-semibold text-[#F5EFF1]">
                    {cat.label}
                  </span>
                  <span className="text-[11px] text-[#A89DA2] mt-0.5 tabular-nums">
                    {formatObrasCount(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN: DETALHES DA OBRA + PERSONALIZAÇÃO */}
      <aside className="space-y-4">
        {/* Card 1: Detalhes da obra */}
        <section
          aria-label="Detalhes da obra"
          className="relative rounded-xl border border-[#4A1522]/85 bg-[#0B080A]/92 p-4 min-h-[250px] flex flex-col justify-between"
        >
          <GothicCorner position="tl" className="!w-5 !h-5" />
          <GothicCorner position="tr" className="!w-5 !h-5" />
          <GothicCorner position="bl" className="!w-5 !h-5" />
          <GothicCorner position="br" className="!w-5 !h-5" />

          {selectedWork ? (
            <>
              <div>
                <h2 className="text-[15px] font-semibold text-[#F5EFF1] mb-3">
                  Detalhes da obra
                </h2>
                <div className="flex gap-3 mb-3">
                  <div className="w-16 h-22 rounded-lg overflow-hidden border border-[#4A1522] bg-[#140A0E] shrink-0 flex items-center justify-center">
                    {selectedWork.coverDataUrl ? (
                      <img
                        src={selectedWork.coverDataUrl}
                        alt={selectedWork.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="w-5 h-5 text-[#E5092D]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#F5EFF1] line-clamp-2">
                      {selectedWork.title}
                    </div>
                    <div className="text-[11px] text-[#E5092D] mt-0.5">
                      {CATEGORY_META[selectedWork.category].label} · {selectedWork.formatLabel}
                    </div>
                    <div className="text-[11px] text-[#A89DA2] mt-1 tabular-nums">
                      {selectedWork.chapterCount} cap. · {selectedWork.pageCount} pág. ·{' '}
                      {formatBytes(selectedWork.totalBytes)}
                    </div>
                  </div>
                </div>
                {selectedProgress && (
                  <div className="mb-3">
                    <div className="flex justify-between text-[11px] text-[#A89DA2] mb-1 tabular-nums">
                      <span>Progresso</span>
                      <span>{Math.round(selectedProgress.percentComplete)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#241A1D] overflow-hidden">
                      <div
                        className="h-full bg-[#E5092D]"
                        style={{width: `${selectedProgress.percentComplete}%`}}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onOpenReader(selectedWork)}
                  className="py-2 px-3 rounded-lg bg-[#E5092D] hover:bg-[#FF173D] text-white text-[12px] font-semibold transition"
                >
                  Ler agora
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('biblioteca')}
                  className="py-2 px-3 rounded-lg bg-[#140E10] border border-[#3E3136] hover:border-[#E5092D] text-[#F5EFF1] text-[12px] font-medium transition"
                >
                  Ver acervo
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-[15px] font-semibold text-[#F5EFF1] mb-3">
                  Detalhes da obra
                </h2>
                <p className="text-[12.5px] leading-relaxed text-[#A89DA2]">
                  Nenhuma obra selecionada. Importe seus arquivos locais para inspecionar capítulos e progresso.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('importar')}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-[#0F0B0D] border border-[#3E3136] hover:border-[#E5092D] text-[#F5EFF1] text-[13px] font-medium transition"
              >
                Importar agora
              </button>
            </>
          )}
        </section>

        {/* Card 2: Personalização */}
        <section
          aria-label="Personalização"
          className="relative rounded-xl border border-[#4A1522]/85 bg-[#0B080A]/92 p-4"
        >
          <GothicCorner position="tl" className="!w-5 !h-5" />
          <GothicCorner position="tr" className="!w-5 !h-5" />
          <GothicCorner position="bl" className="!w-5 !h-5" />
          <GothicCorner position="br" className="!w-5 !h-5" />

          <h2 className="text-[15px] font-semibold text-[#F5EFF1] mb-3">
            Personalização
          </h2>

          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-[62px] h-[82px] rounded-lg overflow-hidden border border-[#650D20] bg-[#140A0E] shrink-0">
              <img
                src={THEME_ASSETS.themeGothicRose}
                alt="Miniatura do tema atual"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="text-[12px] text-[#A89DA2]">Tema atual</div>
              <div className="text-[16px] font-semibold text-[#F5EFF1] mt-0.5">
                {activeThemeLabel}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('personalizacao')}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0F0B0D] border border-[#3E3136] hover:border-[#E5092D] text-[#F5EFF1] text-[12.5px] font-medium inline-flex items-center justify-center gap-2 transition"
          >
            <Palette className="w-3.5 h-3.5 text-[#E5092D]" />
            <span>Alterar tema</span>
          </button>
        </section>
      </aside>
    </div>
  );
};
