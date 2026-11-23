import React, {useEffect, useState} from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Edit3,
  Heart,
  ImagePlus,
  Play,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import {getChaptersByWork, saveChapters, saveWork} from '../services/db';
import {createThumbnailDataUrl} from '../services/thumbnails';
import type {
  Chapter,
  ReadingProgress,
  Work,
  WorkCategory,
} from '../types/ebookfy';
import {formatBytes, formatRelativeDate} from '../utils/formatters';
import {CATEGORY_META} from '../utils/themes';

interface WorkDetailModalProps {
  work: Work;
  progress?: ReadingProgress;
  onClose: () => void;
  onWorkUpdated: () => Promise<void>;
  onOpenChapter: (work: Work, chapterIndex: number) => void;
  onResetProgress: (workId: string) => Promise<void>;
  onDeleteWork: (workId: string) => Promise<void>;
}

export const WorkDetailModal: React.FC<WorkDetailModalProps> = ({
  work,
  progress,
  onClose,
  onWorkUpdated,
  onOpenChapter,
  onResetProgress,
  onDeleteWork,
}) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(work.title);
  const [author, setAuthor] = useState(work.author);
  const [description, setDescription] = useState(work.description);
  const [category, setCategory] = useState<WorkCategory>(work.category);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    getChaptersByWork(work.id).then(setChapters);
  }, [work.id]);

  const handleSaveMetadata = async () => {
    await saveWork({
      ...work,
      title: title.trim() || work.title,
      author: author.trim(),
      description: description.trim(),
      category,
      updatedAt: Date.now(),
    });
    setEditing(false);
    await onWorkUpdated();
  };

  const handleCoverUpload = async (file: File | undefined) => {
    if (!file) return;
    const dataUrl = await createThumbnailDataUrl(file, 480, 700);
    if (dataUrl) {
      await saveWork({...work, coverDataUrl: dataUrl, updatedAt: Date.now()});
      await onWorkUpdated();
    }
  };

  const moveChapter = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= chapters.length) return;
    const reordered = [...chapters];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(target, 0, moved);
    const updated = reordered.map((c, i) => ({...c, orderIndex: i}));
    setChapters(updated);
    await saveChapters(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border border-[#650D20] bg-[#0C080A] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#390D18] bg-[#100B0E]">
          <h2 className="text-sm font-semibold text-[#F5EFF1]">
            Inspeção da Obra e Capítulos
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes da obra"
            className="p-1.5 rounded-lg text-[#A89DA2] hover:text-white hover:bg-[#390D18]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="w-32 sm:w-36 aspect-[3/4] rounded-xl overflow-hidden border border-[#4A1522] bg-[#140A0E] shrink-0 relative group mx-auto sm:mx-0">
              {work.coverDataUrl ? (
                <img
                  src={work.coverDataUrl}
                  alt={work.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-[#E5092D]" />
                </div>
              )}
              <label className="absolute inset-x-0 bottom-0 bg-black/75 py-1.5 text-[11px] text-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                <ImagePlus className="w-3.5 h-3.5 text-[#E5092D]" />
                <span>Trocar capa</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleCoverUpload(e.target.files?.[0])}
                />
              </label>
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              {editing ? (
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título da obra"
                    className="w-full h-9 px-3 rounded-lg bg-[#140C0F] border border-[#4A1522] text-sm text-[#F5EFF1]"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Autor (opcional)"
                      className="h-9 px-3 rounded-lg bg-[#140C0F] border border-[#4A1522] text-xs text-[#F5EFF1]"
                    />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as WorkCategory)}
                      className="h-9 px-3 rounded-lg bg-[#140C0F] border border-[#4A1522] text-xs text-[#F5EFF1]"
                    >
                      {(Object.keys(CATEGORY_META) as WorkCategory[]).map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_META[cat].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Sinopse ou notas locais..."
                    className="w-full p-2.5 rounded-lg bg-[#140C0F] border border-[#4A1522] text-xs text-[#F5EFF1]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveMetadata}
                      className="px-3.5 py-1.5 rounded-lg bg-[#E5092D] text-white text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="px-3.5 py-1.5 rounded-lg border border-[#3E3136] text-xs text-[#D8CFD2]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-[#F5EFF1]">
                      {work.title}
                    </h3>
                    <div className="text-xs text-[#A89DA2] mt-0.5">
                      {work.author ? `${work.author} · ` : ''}
                      {CATEGORY_META[work.category].label} · {work.formatLabel} ·{' '}
                      <span className="tabular-nums">{formatBytes(work.totalBytes)}</span>
                    </div>
                  </div>
                  {work.description && (
                    <p className="text-xs text-[#D8CFD2] leading-relaxed">
                      {work.description}
                    </p>
                  )}
                  <div className="text-xs text-[#A89DA2] tabular-nums">
                    Importado: {formatRelativeDate(work.importedAt)} · Progresso:{' '}
                    {Math.round(progress?.percentComplete ?? 0)}%
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenChapter(work, progress?.lastChapterIndex ?? 0)
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E5092D] hover:bg-[#FF173D] text-white text-xs font-semibold"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {progress && progress.percentComplete > 0
                          ? 'Continuar Leitura'
                          : 'Começar a Ler'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#3E3136] hover:border-[#E5092D] text-xs text-[#F5EFF1]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await saveWork({...work, isFavorite: !work.isFavorite});
                        await onWorkUpdated();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#3E3136] hover:border-[#E5092D] text-xs text-[#F5EFF1]"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          work.isFavorite ? 'fill-[#E5092D] text-[#E5092D]' : ''
                        }`}
                      />
                      <span>{work.isFavorite ? 'Favorito' : 'Favoritar'}</span>
                    </button>
                    {progress && (
                      <button
                        type="button"
                        onClick={() => onResetProgress(work.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#3E3136] hover:border-[#E5092D] text-xs text-[#D8CFD2]"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reiniciar</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#650D20] text-xs text-[#FF6B81] hover:bg-[#390D18]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {confirmDelete && (
            <div className="rounded-xl border border-[#E5092D] bg-[#1D090F] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-[#F5EFF1]">
                Confirmar exclusão permanente de &ldquo;{work.title}&rdquo; da biblioteca local?
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded bg-[#0C080A] text-xs text-[#D8CFD2]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onDeleteWork(work.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded bg-[#E5092D] text-xs font-semibold text-white"
                >
                  Excluir obra
                </button>
              </div>
            </div>
          )}

          {/* Ordered Chapters List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-[#F5EFF1]">
                Capítulos ({chapters.length})
              </h4>
              <span className="text-[11px] text-[#A89DA2]">
                Ordenados naturalmente · Ajuste manual disponível
              </span>
            </div>

            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {chapters.map((ch, idx) => {
                const isDone = progress?.completedChapterIds?.includes(ch.id);
                return (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#3E3136]/75 bg-[#110B0E] px-3 py-2 hover:border-[#E5092D]/70 transition"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenChapter(work, idx)}
                      className="flex-1 text-left flex items-center gap-2.5 min-w-0"
                    >
                      <span className="text-xs font-mono text-[#E5092D] tabular-nums w-7 shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-medium text-[#F5EFF1] truncate">
                        {ch.title}
                      </span>
                      {isDone && (
                        <span className="text-[10px] text-[#E5092D] shrink-0">
                          Concluído
                        </span>
                      )}
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] text-[#A89DA2] tabular-nums mr-1">
                        {ch.pageCount} pág.
                      </span>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveChapter(idx, -1)}
                        aria-label={`Mover ${ch.title} para cima`}
                        className="p-1 rounded hover:bg-[#390D18] text-[#A89DA2] disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === chapters.length - 1}
                        onClick={() => moveChapter(idx, 1)}
                        aria-label={`Mover ${ch.title} para baixo`}
                        className="p-1 rounded hover:bg-[#390D18] text-[#A89DA2] disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
