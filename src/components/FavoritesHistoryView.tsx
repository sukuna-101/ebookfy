import React from 'react';
import {BookOpen, Clock, Heart, Play, Trash2} from 'lucide-react';
import type {HistoryEntry, Work} from '../types/ebookfy';
import {formatRelativeDate} from '../utils/formatters';
import {CATEGORY_META} from '../utils/themes';

export const FavoritesView: React.FC<{
  works: Work[];
  onOpenReader: (work: Work) => void;
  onToggleFavorite: (work: Work) => void;
}> = ({works, onOpenReader, onToggleFavorite}) => {
  const favorites = works.filter((w) => w.isFavorite);
  return (
    <div className="relative z-10 px-4 sm:px-6 pb-20 lg:pb-8 space-y-4">
      <h1 className="text-xl font-semibold text-[#F5EFF1]">Favoritos</h1>
      {favorites.length === 0 ? (
        <div className="rounded-xl border border-[#4A1522]/80 bg-[#0B080A]/90 py-14 px-6 text-center">
          <Heart className="w-8 h-8 text-[#E5092D]/80 mx-auto mb-2.5" />
          <p className="text-sm font-medium text-[#F5EFF1]">
            Nenhuma obra favoritada ainda
          </p>
          <p className="text-xs text-[#A89DA2] mt-1">
            Toque no ícone de coração em qualquer obra da sua biblioteca para fixá-la aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {favorites.map((w) => (
            <div
              key={w.id}
              className="rounded-xl border border-[#4A1522] bg-[#0B080A] overflow-hidden flex flex-col"
            >
              <div
                onClick={() => onOpenReader(w)}
                className="aspect-[3/4] bg-[#140A0E] cursor-pointer overflow-hidden"
              >
                {w.coverDataUrl ? (
                  <img
                    src={w.coverDataUrl}
                    alt={w.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-7 h-7 text-[#E5092D]" />
                  </div>
                )}
              </div>
              <div className="p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#F5EFF1] truncate">
                    {w.title}
                  </div>
                  <div className="text-[11px] text-[#A89DA2]">
                    {CATEGORY_META[w.category].label}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleFavorite(w)}
                  aria-label={`Remover ${w.title} dos favoritos`}
                  className="p-1.5 text-[#E5092D]"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const HistoryView: React.FC<{
  history: HistoryEntry[];
  works: Work[];
  onOpenReader: (work: Work) => void;
  onClearHistory: () => Promise<void>;
}> = ({history, works, onOpenReader, onClearHistory}) => {
  const workMap = new Map(works.map((w) => [w.id, w]));

  return (
    <div className="relative z-10 px-4 sm:px-6 pb-20 lg:pb-8 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#F5EFF1]">
          Histórico de Leitura
        </h1>
        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4A1522] text-xs text-[#D8CFD2] hover:border-[#E5092D]"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#E5092D]" />
            <span>Limpar histórico</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl border border-[#4A1522]/80 bg-[#0B080A]/90 py-14 px-6 text-center">
          <Clock className="w-8 h-8 text-[#E5092D]/80 mx-auto mb-2.5" />
          <p className="text-sm font-medium text-[#F5EFF1]">
            Seu histórico local está vazio
          </p>
          <p className="text-xs text-[#A89DA2] mt-1">
            Todas as suas sessões de leitura ficarão registradas apenas neste dispositivo.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item) => {
            const w = workMap.get(item.workId);
            if (!w) return null;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-[#3E3136]/80 bg-[#0B080A]/92 p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#F5EFF1] truncate">
                    {w.title}
                  </div>
                  <div className="text-xs text-[#A89DA2] mt-0.5 tabular-nums">
                    {item.chapterTitle} · {Math.round(item.percentComplete)}% ·{' '}
                    {formatRelativeDate(item.openedAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenReader(w)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#E5092D] text-white text-xs font-semibold shrink-0"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Retomar</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
