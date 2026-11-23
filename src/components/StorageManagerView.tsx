import React, {useEffect, useState} from 'react';
import {
  CheckCircle2,
  CopyCheck,
  Database,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {clearPageUrlCache} from '../services/archiveReader';
import {getTotalStoredBytes} from '../services/db';
import type {StorageSettings, Work} from '../types/ebookfy';
import {formatBytes} from '../utils/formatters';

interface StorageManagerViewProps {
  works: Work[];
  storageSettings: StorageSettings;
  onUpdateStorageSettings: (next: StorageSettings) => Promise<void>;
  onDeleteWork: (workId: string) => Promise<void>;
  onRegenerateThumbnails: () => Promise<number>;
}

const QUOTA_PRESETS = [
  {label: 'Ilimitado', bytes: 0},
  {label: '512 MB', bytes: 512 * 1024 * 1024},
  {label: '1 GB', bytes: 1024 * 1024 * 1024},
  {label: '2 GB', bytes: 2 * 1024 * 1024 * 1024},
  {label: '5 GB', bytes: 5 * 1024 * 1024 * 1024},
  {label: '10 GB', bytes: 10 * 1024 * 1024 * 1024},
];

export const StorageManagerView: React.FC<StorageManagerViewProps> = ({
  works,
  storageSettings,
  onUpdateStorageSettings,
  onDeleteWork,
  onRegenerateThumbnails,
}) => {
  const [breakdown, setBreakdown] = useState({
    totalBytes: 0,
    worksBytes: 0,
    documentsBytes: 0,
    coversBytes: 0,
  });
  const [deviceEstimate, setDeviceEstimate] = useState<{
    usage: number;
    quota: number;
  } | null>(null);
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);
  const [customGbInput, setCustomGbInput] = useState(
    storageSettings.customQuotaBytes > 0
      ? (storageSettings.customQuotaBytes / (1024 * 1024 * 1024)).toFixed(1)
      : '',
  );
  const [statusMessage, setStatusMessage] = useState('');
  const [confirmDeleteWork, setConfirmDeleteWork] = useState<Work | null>(null);

  const refreshStats = async () => {
    const b = await getTotalStoredBytes();
    setBreakdown(b);
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      setDeviceEstimate({
        usage: est.usage ?? 0,
        quota: est.quota ?? 0,
      });
    }
    if (navigator.storage?.persisted) {
      setIsPersisted(await navigator.storage.persisted());
    }
  };

  useEffect(() => {
    refreshStats();
  }, [works.length]);

  const handleRequestPersist = async () => {
    if (!navigator.storage?.persist) {
      setStatusMessage('Navegador não suporta solicitação de persistência explícita.');
      return;
    }
    const granted = await navigator.storage.persist();
    setIsPersisted(granted);
    setStatusMessage(
      granted
        ? 'Armazenamento persistente ativado! Seus arquivos não serão limpos automaticamente.'
        : 'O navegador manteve o modo padrão. Instale o PWA na tela inicial para maior proteção.',
    );
  };

  const duplicates = React.useMemo(() => {
    const map = new Map<string, Work[]>();
    for (const w of works) {
      const key = w.title.replace(/\s*\(Cópia\)$/i, '').toLocaleLowerCase('pt-BR');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    }
    return [...map.values()].filter((list) => list.length > 1);
  }, [works]);

  const quotaPct =
    storageSettings.customQuotaBytes > 0
      ? Math.min(
          100,
          Math.round((breakdown.totalBytes / storageSettings.customQuotaBytes) * 100),
        )
      : deviceEstimate?.quota
        ? Math.min(100, Math.round((deviceEstimate.usage / deviceEstimate.quota) * 100))
        : 0;

  return (
    <div className="relative z-10 px-4 sm:px-6 pb-20 lg:pb-8 space-y-5 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-[#F5EFF1]">
          Gerenciamento de Armazenamento Local
        </h1>
        <p className="text-xs text-[#A89DA2] mt-1">
          Controle o limite de espaço usado no navegador/PWA e inspecione exatamente quanto cada obra ocupa no dispositivo.
        </p>
      </div>

      {/* Quota Configurator Card */}
      <section className="rounded-xl border border-[#650D20] bg-[#0B080A]/95 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-[#E5092D]" />
            <div>
              <h2 className="text-sm font-semibold text-[#F5EFF1]">
                Capacidade Configurada do Ebookfy
              </h2>
              <p className="text-xs text-[#A89DA2] tabular-nums">
                Usado: {formatBytes(breakdown.totalBytes)} · Limite definido:{' '}
                {storageSettings.customQuotaBytes > 0
                  ? formatBytes(storageSettings.customQuotaBytes)
                  : 'Ilimitado (até a cota do dispositivo)'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestPersist}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#4A1522] bg-[#140A0E] hover:border-[#E5092D] text-xs font-medium text-[#F5EFF1] whitespace-nowrap"
          >
            <ShieldCheck className="w-4 h-4 text-[#E5092D]" />
            <span>
              {isPersisted ? 'Persistência Ativa' : 'Proteger Armazenamento PWA'}
            </span>
          </button>
        </div>

        {/* Usage Progress Bar */}
        <div>
          <div className="h-2.5 rounded-full bg-[#241A1D] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#8E0A24] to-[#FF173D] transition-all"
              style={{width: `${Math.max(2, quotaPct)}%`}}
            />
          </div>
          {deviceEstimate && (
            <div className="flex justify-between text-[11px] text-[#A89DA2] mt-1.5 tabular-nums">
              <span>Espaço ocupado pelo app: {formatBytes(deviceEstimate.usage)}</span>
              <span>
                Disponível estimado no dispositivo:{' '}
                {formatBytes(Math.max(0, deviceEstimate.quota - deviceEstimate.usage))}
              </span>
            </div>
          )}
        </div>

        {/* Quota Presets & Custom GB Input */}
        <div className="space-y-2.5 pt-2 border-t border-[#390D18]">
          <div className="text-xs font-medium text-[#D8CFD2]">
            Definir quanto armazenamento este site/PWA pode usar:
          </div>
          <div className="flex flex-wrap gap-2">
            {QUOTA_PRESETS.map((p) => {
              const active = storageSettings.customQuotaBytes === p.bytes;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={async () => {
                    await onUpdateStorageSettings({
                      ...storageSettings,
                      customQuotaBytes: p.bytes,
                    });
                    setCustomGbInput(
                      p.bytes > 0
                        ? (p.bytes / (1024 * 1024 * 1024)).toFixed(1)
                        : '',
                    );
                    setStatusMessage(`Limite atualizado para ${p.label}.`);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    active
                      ? 'border-[#E5092D] bg-[#650D20] text-white'
                      : 'border-[#3E3136] bg-[#120C0E] text-[#D8CFD2] hover:border-[#E5092D]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const gb = parseFloat(customGbInput.replace(',', '.'));
                if (!Number.isFinite(gb) || gb <= 0) return;
                const bytes = Math.round(gb * 1024 * 1024 * 1024);
                await onUpdateStorageSettings({
                  ...storageSettings,
                  customQuotaBytes: bytes,
                });
                setStatusMessage(`Limite personalizado definido para ${gb} GB.`);
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="number"
                step="0.5"
                min="0.1"
                value={customGbInput}
                onChange={(e) => setCustomGbInput(e.target.value)}
                placeholder="Outro (GB)"
                aria-label="Limite personalizado em GB"
                className="w-24 h-8 px-2.5 rounded-lg bg-[#120C0E] border border-[#3E3136] text-xs text-[#F5EFF1]"
              />
              <button
                type="submit"
                className="h-8 px-3 rounded-lg bg-[#E5092D] text-white text-xs font-semibold"
              >
                Aplicar GB
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Breakdown Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#3E3136] bg-[#0B080A] p-4">
          <div className="text-xs text-[#A89DA2]">Obras &amp; Capítulos</div>
          <div className="text-lg font-semibold text-[#F5EFF1] mt-1 tabular-nums">
            {formatBytes(breakdown.worksBytes)}
          </div>
        </div>
        <div className="rounded-xl border border-[#3E3136] bg-[#0B080A] p-4">
          <div className="text-xs text-[#A89DA2]">Livros &amp; Documentos</div>
          <div className="text-lg font-semibold text-[#F5EFF1] mt-1 tabular-nums">
            {formatBytes(breakdown.documentsBytes)}
          </div>
        </div>
        <div className="rounded-xl border border-[#3E3136] bg-[#0B080A] p-4">
          <div className="text-xs text-[#A89DA2]">Capas &amp; Miniaturas</div>
          <div className="text-lg font-semibold text-[#F5EFF1] mt-1 tabular-nums">
            {formatBytes(breakdown.coversBytes)}
          </div>
        </div>
      </div>

      {/* Maintenance Tools */}
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => {
            clearPageUrlCache();
            setStatusMessage('Cache de decodificação de imagens limpo com segurança.');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#3E3136] bg-[#0B080A] hover:border-[#E5092D] text-xs text-[#F5EFF1]"
        >
          <Database className="w-4 h-4 text-[#E5092D]" />
          <span>Limpar cache de memória</span>
        </button>

        <button
          type="button"
          onClick={async () => {
            const count = await onRegenerateThumbnails();
            await refreshStats();
            setStatusMessage(`${count} miniatura(s) verificada(s).`);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#3E3136] bg-[#0B080A] hover:border-[#E5092D] text-xs text-[#F5EFF1]"
        >
          <RefreshCw className="w-4 h-4 text-[#E5092D]" />
          <span>Regenerar miniaturas</span>
        </button>
      </div>

      {statusMessage && (
        <div className="rounded-lg border border-[#650D20] bg-[#140A0E] px-4 py-2.5 text-xs text-[#F5EFF1] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#E5092D] shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Duplicate Finder */}
      {duplicates.length > 0 && (
        <div className="rounded-xl border border-amber-700/60 bg-amber-950/20 p-4 space-y-2">
          <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
            <CopyCheck className="w-4 h-4" />
            <span>Possíveis obras duplicadas detectadas ({duplicates.length} grupo(s))</span>
          </div>
          {duplicates.map((grp, idx) => (
            <div key={idx} className="text-xs text-[#D8CFD2]">
              {grp.map((w) => `${w.title} (${formatBytes(w.totalBytes)})`).join(' · ')}
            </div>
          ))}
        </div>
      )}

      {/* Per-Work Breakdown */}
      <section className="rounded-xl border border-[#3E3136] bg-[#0B080A] p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#F5EFF1]">
          Espaço por Obra ({works.length})
        </h2>
        {works.length === 0 ? (
          <p className="text-xs text-[#A89DA2]">
            Nenhuma obra armazenada ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {works.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-[#241A1D] last:border-none"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#F5EFF1] truncate">
                    {w.title}
                  </div>
                  <div className="text-[11px] text-[#A89DA2] tabular-nums">
                    {w.chapterCount} cap. · {w.pageCount} pág.
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-[#D8CFD2] tabular-nums">
                    {formatBytes(w.totalBytes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteWork(w)}
                    aria-label={`Remover ${w.title} do armazenamento`}
                    className="p-1.5 rounded text-[#A89DA2] hover:text-[#FF173D]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {confirmDeleteWork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#650D20] bg-[#100B0E] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[#F5EFF1]">
              Remover &ldquo;{confirmDeleteWork.title}&rdquo;?
            </h3>
            <p className="text-xs text-[#A89DA2]">
              Liberará {formatBytes(confirmDeleteWork.totalBytes)} do armazenamento local do navegador. Seus arquivos originais no computador ou celular permanecem intactos.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteWork(null)}
                className="px-3.5 py-1.5 rounded-lg border border-[#3E3136] text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteWork(confirmDeleteWork.id);
                  setConfirmDeleteWork(null);
                  await refreshStats();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#E5092D] text-white text-xs font-semibold"
              >
                Confirmar exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
