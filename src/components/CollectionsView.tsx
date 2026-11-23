import React, {useState} from 'react';
import {Folder, FolderPlus, Play, Trash2} from 'lucide-react';
import type {Collection, Work} from '../types/ebookfy';

interface CollectionsViewProps {
  collections: Collection[];
  works: Work[];
  onCreateCollection: (name: string, description: string) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  onOpenReader: (work: Work) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections,
  works,
  onCreateCollection,
  onDeleteCollection,
  onOpenReader,
}) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [activeColId, setActiveColId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreateCollection(name.trim(), desc.trim());
    setName('');
    setDesc('');
  };

  const activeCol = collections.find((c) => c.id === activeColId) ?? null;
  const colWorks = activeCol
    ? works.filter((w) => w.collectionIds.includes(activeCol.id))
    : [];

  return (
    <div className="relative z-10 px-4 sm:px-6 pb-20 lg:pb-8 space-y-5 max-w-5xl">
      <h1 className="text-xl font-semibold text-[#F5EFF1]">
        Coleções Personalizadas
      </h1>

      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-[#4A1522]/85 bg-[#0B080A]/92 p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2.5 items-end"
      >
        <div>
          <label className="block text-xs text-[#D8CFD2] mb-1">
            Nome da coleção
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Dark Fantasy Favoritos"
            className="w-full h-9 px-3 rounded-lg bg-[#120C0F] border border-[#3E3136] text-xs text-[#F5EFF1] focus:outline-none focus:border-[#E5092D]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#D8CFD2] mb-1">
            Descrição (opcional)
          </label>
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Notas sobre a coleção"
            className="w-full h-9 px-3 rounded-lg bg-[#120C0F] border border-[#3E3136] text-xs text-[#F5EFF1] focus:outline-none focus:border-[#E5092D]"
          />
        </div>
        <button
          type="submit"
          className="h-9 px-4 rounded-lg bg-[#E5092D] hover:bg-[#FF173D] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>Criar coleção</span>
        </button>
      </form>

      {collections.length === 0 ? (
        <div className="rounded-xl border border-[#4A1522]/80 bg-[#0B080A]/90 py-14 px-6 text-center">
          <Folder className="w-8 h-8 text-[#E5092D]/80 mx-auto mb-2.5" />
          <p className="text-sm font-medium text-[#F5EFF1]">
            Nenhuma coleção criada
          </p>
          <p className="text-xs text-[#A89DA2] mt-1">
            Crie coleções para agrupar suas obras localmente por gênero, saga ou prioridade.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {collections.map((col) => {
            const count = works.filter((w) => w.collectionIds.includes(col.id)).length;
            const isSelected = activeColId === col.id;
            return (
              <div
                key={col.id}
                onClick={() => setActiveColId(isSelected ? null : col.id)}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  isSelected
                    ? 'border-[#E5092D] bg-[#160A0F]'
                    : 'border-[#3E3136]/90 bg-[#0B080A] hover:border-[#E5092D]/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder className="w-5 h-5 text-[#E5092D] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#F5EFF1] truncate">
                        {col.name}
                      </div>
                      <div className="text-[11px] text-[#A89DA2] tabular-nums">
                        {count} {count === 1 ? 'obra' : 'obras'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCollection(col.id);
                    }}
                    aria-label={`Excluir coleção ${col.name}`}
                    className="p-1.5 text-[#A89DA2] hover:text-[#FF173D]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {col.description && (
                  <p className="text-xs text-[#A89DA2] mt-2 line-clamp-2">
                    {col.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeCol && (
        <div className="rounded-xl border border-[#4A1522] bg-[#0B080A] p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[#F5EFF1]">
            Obras em &ldquo;{activeCol.name}&rdquo;
          </h2>
          {colWorks.length === 0 ? (
            <p className="text-xs text-[#A89DA2]">
              Use o modo &ldquo;Selecionar&rdquo; na Biblioteca para adicionar obras a esta coleção.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {colWorks.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-[#3E3136] bg-[#120B0E]"
                >
                  <span className="text-xs font-medium text-[#F5EFF1] truncate">
                    {w.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenReader(w)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#E5092D] text-white text-[11px] font-semibold"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Ler
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
