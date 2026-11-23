import React, {useRef, useState} from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileArchive,
  FolderOpen,
  Loader2,
  Play,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import {
  collectDroppedEntries,
  importFilesIntoLibrary,
  type ImportedFileWithPath,
} from '../services/importer';
import type {ImportJobItem, Work, WorkCategory} from '../types/ebookfy';
import {formatBytes} from '../utils/formatters';
import {CATEGORY_META} from '../utils/themes';

interface ImportViewProps {
  onImportComplete: (newWorks: Work[]) => void;
  onOpenReader: (work: Work) => void;
  onGoLibrary: () => void;
}

export const ImportView: React.FC<ImportViewProps> = ({
  onImportComplete,
  onOpenReader,
  onGoLibrary,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<WorkCategory | 'auto'>('auto');
  const [customTitle, setCustomTitle] = useState('');
  const [jobs, setJobs] = useState<ImportJobItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importedWorks, setImportedWorks] = useState<Work[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const runImport = async (items: ImportedFileWithPath[]) => {
    if (items.length === 0) return;
    setIsImporting(true);
    setErrors([]);
    setImportedWorks([]);

    try {
      const res = await importFilesIntoLibrary(items, {
        preferredCategory: selectedCategory === 'auto' ? undefined : selectedCategory,
        targetWorkTitle: customTitle.trim() || undefined,
        onJobUpdate: setJobs,
      });
      setImportedWorks(res.createdWorks);
      setErrors(res.errors);
      if (res.createdWorks.length > 0) {
        onImportComplete(res.createdWorks);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const mapped: ImportedFileWithPath[] = Array.from(fileList).map((file) => ({
      file,
      relativePath:
        (file as File & {webkitRelativePath?: string}).webkitRelativePath || file.name,
    }));
    await runImport(mapped);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const collected = await collectDroppedEntries(items);
      await runImport(collected);
    } else if (e.dataTransfer.files.length > 0) {
      await handleFilesSelected(e.dataTransfer.files);
    }
  };

  return (
    <div className="relative z-10 px-4 sm:px-6 pb-20 lg:pb-8 space-y-5 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-[#F5EFF1]">
            Importar Arquivos e Pastas Locais
          </h1>
          <p className="text-xs text-[#A89DA2] mt-1">
            Processamento 100% no dispositivo. Suporta ZIP/CBZ sem limite de tamanho, TAR/GZ, EPUB, PDF, DOCX, ODT, RTF, TXT e pastas de imagens ordenadas automaticamente.
          </p>
        </div>
      </div>

      {/* Pre-import options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-[#4A1522]/80 bg-[#0B080A]/92 p-4">
        <div>
          <label
            htmlFor="import-category"
            className="block text-xs font-medium text-[#D8CFD2] mb-1.5"
          >
            Categoria de destino
          </label>
          <select
            id="import-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as WorkCategory | 'auto')}
            className="w-full h-10 px-3 rounded-lg bg-[#120C0F] border border-[#3E3136] text-sm text-[#F5EFF1] focus:outline-none focus:border-[#E5092D]"
          >
            <option value="auto">Detectar automaticamente pelo conteúdo</option>
            {(Object.keys(CATEGORY_META) as WorkCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_META[cat].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="import-title"
            className="block text-xs font-medium text-[#D8CFD2] mb-1.5"
          >
            Nome da obra (opcional)
          </label>
          <input
            id="import-title"
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Deixe vazio para detectar pelo arquivo/pasta"
            className="w-full h-10 px-3 rounded-lg bg-[#120C0F] border border-[#3E3136] text-sm text-[#F5EFF1] placeholder:text-[#A89DA2]/70 focus:outline-none focus:border-[#E5092D]"
          />
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-7 sm:p-10 text-center transition ${
          isDragging
            ? 'border-[#FF173D] bg-[#390D18]/35'
            : 'border-[#650D20]/80 bg-[#0B080A]/90 hover:border-[#E5092D]'
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-[#390D18]/70 border border-[#650D20] flex items-center justify-center mx-auto mb-3 text-[#FF173D]">
          <Upload className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-[#F5EFF1]">
          Arraste pastas, ZIP/CBZ, EPUB, PDF ou imagens para cá
        </h2>
        <p className="text-xs text-[#A89DA2] mt-1 max-w-lg mx-auto">
          Arquivos compactados grandes (MB ou GB) são indexados sob demanda com leitura instantânea e ordenação natural automática de capítulos e páginas (1, 2, 3... 10).
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#8E0A24] to-[#E5092D] text-white text-xs font-semibold hover:brightness-110 disabled:opacity-50 transition"
          >
            <FileArchive className="w-4 h-4" />
            <span>Selecionar Arquivos</span>
          </button>

          <button
            type="button"
            disabled={isImporting}
            onClick={() => folderInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#140C0F] border border-[#4A1522] hover:border-[#E5092D] text-[#F5EFF1] text-xs font-semibold disabled:opacity-50 transition"
          >
            <FolderOpen className="w-4 h-4 text-[#E5092D]" />
            <span>Selecionar Pasta / Capítulos</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".zip,.cbz,.tar,.gz,.tgz,.epub,.pdf,.txt,.md,.rtf,.docx,.odt,.rar,.cbr,.7z,image/*"
          className="hidden"
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />

        <input
          ref={folderInputRef}
          type="file"
          multiple
          {...({webkitdirectory: '', directory: ''} as Record<string, string>)}
          className="hidden"
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Security & Validation Note */}
      <div className="rounded-xl border border-[#3E3136]/70 bg-[#0B080A]/80 px-4 py-3 flex items-center gap-3 text-xs text-[#A89DA2]">
        <ShieldAlert className="w-4 h-4 text-[#E5092D] shrink-0" />
        <span>
          Proteção ativa: assinaturas reais de arquivo (magic bytes), bloqueio de path traversal (../), proteção contra ZIP bombs e nenhum script executado.
        </span>
      </div>

      {/* Batch Queue */}
      {jobs.length > 0 && (
        <section className="rounded-xl border border-[#4A1522]/85 bg-[#0B080A]/95 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#F5EFF1]">
              Fila de Importação ({jobs.length})
            </h3>
            {isImporting && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#FF173D]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processando localmente...
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-lg border border-[#3E3136]/70 bg-[#100B0E] p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[#F5EFF1] truncate">
                    {job.fileName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0 tabular-nums text-[#A89DA2]">
                    <span>{job.detectedType}</span>
                    <span>·</span>
                    <span>{formatBytes(job.sizeBytes)}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-[#241A1D] overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        job.status === 'error' ? 'bg-amber-500' : 'bg-[#E5092D]'
                      }`}
                      style={{width: `${job.progress}%`}}
                    />
                  </div>
                  <span className="text-[11px] text-[#D8CFD2] shrink-0">
                    {job.stage}
                  </span>
                </div>
                {job.errorMessage && (
                  <p className="mt-1.5 text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{job.errorMessage}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Results Banner */}
      {importedWorks.length > 0 && (
        <div className="rounded-xl border border-[#650D20] bg-[#140A0E] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#E5092D] shrink-0" />
            <div>
              <div className="text-sm font-semibold text-[#F5EFF1]">
                {importedWorks.length} {importedWorks.length === 1 ? 'obra importada' : 'obras importadas'} com sucesso
              </div>
              <div className="text-xs text-[#A89DA2]">
                {importedWorks.map((w) => w.title).join(', ')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenReader(importedWorks[0])}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E5092D] hover:bg-[#FF173D] text-white text-xs font-semibold transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Ler agora</span>
            </button>
            <button
              type="button"
              onClick={onGoLibrary}
              className="px-4 py-2 rounded-lg border border-[#4A1522] bg-[#0B080A] hover:border-[#E5092D] text-[#F5EFF1] text-xs font-medium transition"
            >
              Ver na Biblioteca
            </button>
          </div>
        </div>
      )}

      {errors.length > 0 && importedWorks.length === 0 && (
        <div className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-4 text-xs text-amber-200 space-y-1">
          {errors.map((e, idx) => (
            <div key={idx}>{e}</div>
          ))}
        </div>
      )}
    </div>
  );
};
