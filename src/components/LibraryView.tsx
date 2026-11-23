import React, {useMemo, useState} from 'react';
import {
  BookOpen,
  CheckSquare,
  Download,
  FolderPlus,
  Heart,
  Info,
  LayoutGrid,
  List,
  Play,
  Square,
  Trash2,
} from 'lucide-react';
import type {
  Collection,
  ReadingProgress,
  ReadingStatus,
  Work,
  WorkCategory,
} from '../types/ebookfy';
import {formatBytes} from '../utils/formatters';
import {CATEGORY_META} from '../utils/themes';

interface LibraryViewProps {
  works: Work[];
  progressMap: Record<string, ReadingProgress>;
  collections: Collection[];
  searchQuery: string;
  initialCategory?: WorkCategory | 'todos';
  onOpenReader: (work: Work) => void;
  onInspectWork: (work: Work) => void;
  onToggleFavorite: (work: Work) => void;
  onDeleteWorks: (workIds: string[]) => Promise<void>;
  onAssignCollection: (workIds: string[], collectionId: string) => Promise<void>;
  onGoImport: () => void;
}

type SortKey = 'recentes' | 'titulo' | 'progresso' | 'tamanho';

export const LibraryView: React.FC<LibraryViewProps> = ({
  works,
  progressMap,
  collections,
  searchQuery,
  initialCategory = 'todos',
  onOpenReader,
  onInspectWork,
  onToggleFavorite,
  onDeleteWorks,
  onAssignCollection,
  onGoImport,
}) => {
  const [category, setCategory] = useState<WorkCategory | 'todos'>(initialCategory);
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'todos'>('todos');
  const [sortBy, setSortBy] = useState<SortKey>('recentes');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);

  React.useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('pt-BR');
    return works
      .filter((w) => {
        if (category !== 'todos' && w.category !== category) return false;
        if (q) {
          const hay = `${w.title} ${w.author} ${w.formatLabel}`.toLocaleLowerCase('pt-BR');
          if (!hay.includes(q)) return false;
        }
        const prog = progressMap[w.id];
        const status: ReadingStatus = prog?.status ?? 'nao_iniciado';
        if (statusFilter !== 'todos' && status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'titulo') return a.title.localeCompare(b.title, 'pt-BR');
        if (sortBy === 'tamanho') return b.totalBytes - a.totalBytes;
        if (sortBy === 'progresso') {
          return (
            (progressMap[b.id]?.percentComplete ?? 0) -
            (progressMap[a.id]?.percentComplete ?? 0)
          );
        }
        return b.updatedAt - a.updatedAt;
      });
  }, [works, category, statusFilter, sortBy, searchQuery, progressMap]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="relative z-10 px-4 sm:px-6 pb-20 lg:pb-8 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#F5EFF1]">Biblioteca Local</h1>
          <p className="text-xs text-[#A89DA2] tabular-nums">
            {filtered.length} de {works.length} {works.length === 1 ? 'obra' : 'obras'} no dispositivo
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrar por status de leitura"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReadingStatus | 'todos')}
            className="h-9 px-3 rounded-lg bg-[#0C080A] border border-[#3E3136] text-xs text-[#F5EFF1] focus:outline-none focus:border-[#E5092D]"
          >
            <option value="todos">Todos os status</option>
            <option value="nao_iniciado">Não iniciados</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluídos</option>
          </select>

          <select
            aria-label="Ordenar obras"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="h-9 px-3 rounded-lg bg-[#0C080A] border border-[#3E3136] text-xs text-[#F5EFF1] focus:outline-none focus:border-[#E5092D]"
          >
            <option value="recentes">Mais recentes</option>
            <option value="titulo">Título (A–Z)</option>
            <option value="progresso">Progresso</option>
            <option value="tamanho">Tamanho</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSelectionMode((s) => !s);
              setSelectedIds(new Set());
            }}
            className={`h-9 px-3 rounded-lg border text-xs font-medium transition ${
              selectionMode
                ? 'border-[#E5092D] bg-[#390D18] text-white'
                : 'border-[#3E3136] bg-[#0C080A] text-[#D8CFD2] hover:border-[#E5092D]'
            }`}
          >
            Selecionar
          </button>

          <div className="flex items-center rounded-lg border border-[#3E3136] bg-[#0C080A] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Visualização em grade"
              className={`p-1.5 rounded-md ${
                viewMode === 'grid' ? 'bg-[#650D20] text-white' : 'text-[#A89DA2]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="Visualização em lista"
              className={`p-1.5 rounded-md ${
                viewMode === 'list' ? 'bg-[#650D20] text-white' : 'text-[#A89DA2]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCategory('todos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition ${
            category === 'todos'
              ? 'bg-[#E5092D] text-white'
              : 'bg-[#0C080A] border border-[#3E3136] text-[#D8CFD2] hover:border-[#E5092D]'
          }`}
        >
          Todas as obras
        </button>
        {(Object.keys(CATEGORY_META) as WorkCategory[]).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition ${
              category === cat
                ? 'bg-[#E5092D] text-white'
                : 'bg-[#0C080A] border border-[#3E3136] text-[#D8CFD2] hover:border-[#E5092D]'
            }`}
          >
            {CATEGORY_META[cat].label}
          </button>
        ))}
      </div>

      {/* Batch Action Bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="rounded-xl border border-[#E5092D]/70 bg-[#180A0F] p-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-[#F5EFF1] tabular-nums">
            {selectedIds.size} selecionada(s)
          </span>
          <div className="flex items-center gap-2">
            {collections.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCollectionPickerOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B080A] border border-[#4A1522] text-xs text-[#F5EFF1]"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-[#E5092D]" />
                  <span>Adicionar à coleção</span>
                </button>
                {collectionPickerOpen && (
                  <div className="absolute right-0 mt-1 w-48 rounded-lg border border-[#650D20] bg-[#100B0E] p-1 z-30 shadow-xl">
                    {collections.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={async () => {
                          await onAssignCollection(Array.from(selectedIds), c.id);
                          setCollectionPickerOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-[#F5EFF1] hover:bg-[#390D18] rounded"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setConfirmDeleteIds(Array.from(selectedIds))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8E0A24] hover:bg-[#E5092D] text-xs font-medium text-white"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir selecionadas</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty Library State */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#4A1522]/80 bg-[#0B080A]/90 py-14 px-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#390D18]/60 border border-[#650D20] flex items-center justify-center mx-auto mb-3 text-[#E5092D]">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-[#F5EFF1]">
            {works.length === 0
              ? 'Sua biblioteca está zerada'
              : 'Nenhuma obra encontrada para este filtro'}
          </h2>
          <p className="text-xs text-[#A89DA2] mt-1 max-w-md mx-auto">
            {works.length === 0
              ? 'Somente as obras que você importar aparecem aqui. Adicione seus mangás, manhwas, HQs, livros EPUB ou PDFs do seu dispositivo.'
              : 'Tente limpar a pesquisa ou selecionar outra categoria.'}
          </p>
          {works.length === 0 && (
            <button
              type="button"
              onClick={onGoImport}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#8E0A24] to-[#E5092D] text-white text-xs font-semibold hover:brightness-110 transition"
            >
              <Download className="w-4 h-4" />
              <span>Importar Obras Locais</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {filtered.map((work) => {
            const prog = progressMap[work.id];
            const pct = Math.round(prog?.percentComplete ?? 0);
            const isSel = selectedIds.has(work.id);
            return (
              <article
                key={work.id}
                className={`group rounded-xl border bg-[#0B080A]/95 overflow-hidden flex flex-col transition ${
                  isSel
                    ? 'border-[#FF173D] ring-1 ring-[#FF173D]'
                    : 'border-[#3E3136]/90 hover:border-[#E5092D]/80'
                }`}
              >
                <div
                  onClick={() =>
                    selectionMode ? toggleSelect(work.id) : onOpenReader(work)
                  }
                  className="relative aspect-[3/4] bg-[#140A0E] cursor-pointer overflow-hidden"
                >
                  {work.coverDataUrl ? (
                    <img
                      src={work.coverDataUrl}
                      alt={`Capa de ${work.title}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-[#1A0B10] to-[#080607]">
                      <BookOpen className="w-8 h-8 text-[#E5092D]/80 mb-2" />
                      <span className="text-[11px] font-medium text-[#D8CFD2] line-clamp-3">
                        {work.title}
                      </span>
                    </div>
                  )}

                  {selectionMode && (
                    <div className="absolute top-2 left-2 p-1 rounded bg-black/80 text-white">
                      {isSel ? (
                        <CheckSquare className="w-4 h-4 text-[#FF173D]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#A89DA2]" />
                      )}
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#241A1D]">
                    <div
                      className="h-full bg-[#E5092D]"
                      style={{width: `${pct}%`}}
                    />
                  </div>
                </div>

                <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
                  <div>
                    <h3 className="text-[13px] font-semibold text-[#F5EFF1] line-clamp-1">
                      {work.title}
                    </h3>
                    <div className="text-[11px] text-[#A89DA2] mt-0.5 tabular-nums truncate">
                      {CATEGORY_META[work.category].label} · {work.chapterCount} cap. · {pct}%
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#2A1D21]">
                    <button
                      type="button"
                      onClick={() => onOpenReader(work)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF173D] hover:text-white transition"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Ler</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(work)}
                        aria-label={`Favoritar ${work.title}`}
                        className="p-1.5 rounded hover:bg-[#390D18]/60 text-[#A89DA2] hover:text-[#FF173D]"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            work.isFavorite ? 'fill-[#E5092D] text-[#E5092D]' : ''
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => onInspectWork(work)}
                        aria-label={`Detalhes de ${work.title}`}
                        className="p-1.5 rounded hover:bg-[#390D18]/60 text-[#A89DA2] hover:text-white"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((work) => {
            const prog = progressMap[work.id];
            const pct = Math.round(prog?.percentComplete ?? 0);
            return (
              <div
                key={work.id}
                className="rounded-xl border border-[#3E3136]/85 bg-[#0B080A]/92 p-3 flex items-center justify-between gap-3 hover:border-[#E5092D]/70 transition"
              >
                <div
                  onClick={() => onOpenReader(work)}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-[#140A0E] border border-[#4A1522] shrink-0 flex items-center justify-center">
                    {work.coverDataUrl ? (
                      <img
                        src={work.coverDataUrl}
                        alt={work.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="w-5 h-5 text-[#E5092D]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#F5EFF1] truncate">
                      {work.title}
                    </div>
                    <div className="text-xs text-[#A89DA2] tabular-nums mt-0.5">
                      {CATEGORY_META[work.category].label} · {work.formatLabel} · {work.chapterCount} cap. · {work.pageCount} pág. · {formatBytes(work.totalBytes)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-[#D8CFD2] tabular-nums w-10 text-right">
                    {pct}%
                  </span>
                  <button
                    type="button"
                    onClick={() => onInspectWork(work)}
                    className="px-3 py-1.5 rounded-lg border border-[#3E3136] hover:border-[#E5092D] text-xs text-[#F5EFF1]"
                  >
                    Detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenReader(work)}
                    className="px-3 py-1.5 rounded-lg bg-[#E5092D] hover:bg-[#FF173D] text-xs font-semibold text-white"
                  >
                    Ler
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteIds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[#650D20] bg-[#100B0E] p-5 space-y-4">
            <h3 className="text-base font-semibold text-[#F5EFF1]">
              Confirmar exclusão da biblioteca local
            </h3>
            <p className="text-xs text-[#A89DA2] leading-relaxed">
              Esta ação removerá permanentemente {confirmDeleteIds.length}{' '}
              {confirmDeleteIds.length === 1 ? 'obra' : 'obras'}, capítulos armazenados no IndexedDB, capas e histórico de leitura. Arquivos originais nas suas pastas do computador/celular não são apagados.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteIds(null)}
                className="px-4 py-2 rounded-lg border border-[#3E3136] text-xs text-[#F5EFF1]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteWorks(confirmDeleteIds);
                  setConfirmDeleteIds(null);
                  setSelectedIds(new Set());
                  setSelectionMode(false);
                }}
                className="px-4 py-2 rounded-lg bg-[#E5092D] text-xs font-semibold text-white"
              >
                Excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
