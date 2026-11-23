import React, {useRef, useState} from 'react';
import {
  CheckCircle2,
  Download,
  Lock,
  Shield,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import {
  exportBackupZip,
  inspectBackupZip,
  restoreBackupZip,
} from '../services/backup';
import type {BackupManifest, Work} from '../types/ebookfy';

interface BackupViewProps {
  works: Work[];
  onRestored: () => Promise<void>;
}

export const BackupView: React.FC<BackupViewProps> = ({works, onRestored}) => {
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const [includeMedia, setIncludeMedia] = useState(true);
  const [exportPassword, setExportPassword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [inspected, setInspected] = useState<{
    manifest: BackupManifest;
    mediaCount: number;
    checksumValid: boolean;
    workTitles: string[];
  } | null>(null);

  const handleExport = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const {blob, fileName, manifest} = await exportBackupZip({
        includeMedia,
        selectedWorkIds: selectedIds.length > 0 ? selectedIds : undefined,
        password: exportPassword.trim() || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(
        `Backup "${fileName}" gerado (${manifest.workCount} obra(s)) com verificação SHA-256.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar backup.');
    } finally {
      setBusy(false);
    }
  };

  const handleInspectRestore = async (file: File, pass?: string) => {
    setError('');
    try {
      const res = await inspectBackupZip(file, pass || undefined);
      setRestoreFile(file);
      setInspected({
        manifest: res.manifest,
        mediaCount: res.mediaCount,
        checksumValid: res.checksumValid,
        workTitles: res.payload.works.map((w) => w.title),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Falha ao ler backup. Verifique se a senha está correta.',
      );
      setInspected(null);
    }
  };

  const handleApplyRestore = async () => {
    if (!restoreFile) return;
    setBusy(true);
    setError('');
    try {
      const res = await restoreBackupZip(restoreFile, {
        password: restorePassword.trim() || undefined,
        overwriteExisting,
      });
      await onRestored();
      setMessage(
        `Restauração concluída: ${res.restoredWorks} obra(s) restaurada(s), ${res.skippedWorks} ignorada(s).`,
      );
      setInspected(null);
      setRestoreFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao restaurar backup.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative z-10 px-4 sm:px-6 pb-20 lg:pb-8 space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-[#F5EFF1]">
          Backup &amp; Restauração Local
        </h1>
        <p className="text-xs text-[#A89DA2] mt-1">
          Exporte um arquivo ZIP offline com manifesto e integridade SHA-256 para transferir manualmente entre PC e celular. Nenhuma nuvem envolvida.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export */}
        <section className="rounded-xl border border-[#4A1522] bg-[#0B080A]/92 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[#E5092D]" />
            <h2 className="text-sm font-semibold text-[#F5EFF1]">Exportar Backup</h2>
          </div>

          <label className="flex items-center gap-2 text-xs text-[#D8CFD2] cursor-pointer">
            <input
              type="checkbox"
              checked={includeMedia}
              onChange={(e) => setIncludeMedia(e.target.checked)}
              className="accent-[#E5092D]"
            />
            <span>Incluir arquivos e capítulos (desmarque para exportar só progresso e configs)</span>
          </label>

          {works.length > 0 && (
            <div>
              <div className="text-[11px] text-[#A89DA2] mb-1">
                Obras específicas (vazio = todas as {works.length}):
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 border border-[#2C1A20] rounded-lg p-2 bg-[#100B0E]">
                {works.map((w) => (
                  <label
                    key={w.id}
                    className="flex items-center gap-2 text-xs text-[#D8CFD2] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(w.id)}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? [...prev, w.id]
                            : prev.filter((id) => id !== w.id),
                        )
                      }
                      className="accent-[#E5092D]"
                    />
                    <span className="truncate">{w.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] text-[#A89DA2] mb-1">
              Senha opcional do ZIP
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-[#A89DA2] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                placeholder="Deixe vazio para sem senha"
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-[#120C0E] border border-[#3E3136] text-xs text-[#F5EFF1]"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={handleExport}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#8E0A24] to-[#E5092D] text-white text-xs font-semibold hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Gerando pacote ZIP...' : 'Baixar Pacote de Backup (.zip)'}
          </button>
        </section>

        {/* Restore */}
        <section className="rounded-xl border border-[#4A1522] bg-[#0B080A]/92 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#E5092D]" />
            <h2 className="text-sm font-semibold text-[#F5EFF1]">
              Restaurar Backup
            </h2>
          </div>

          <div>
            <label className="block text-[11px] text-[#A89DA2] mb-1">
              Senha (caso o backup esteja protegido)
            </label>
            <input
              type="password"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
              placeholder="Senha do arquivo ZIP"
              className="w-full h-9 px-3 rounded-lg bg-[#120C0E] border border-[#3E3136] text-xs text-[#F5EFF1]"
            />
          </div>

          <button
            type="button"
            onClick={() => restoreInputRef.current?.click()}
            className="w-full py-2.5 rounded-lg border border-[#4A1522] bg-[#140C0F] hover:border-[#E5092D] text-[#F5EFF1] text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4 text-[#E5092D]" />
            <span>Selecionar Arquivo de Backup (.zip)</span>
          </button>

          <input
            ref={restoreInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleInspectRestore(f, restorePassword);
              e.target.value = '';
            }}
          />

          {inspected && (
            <div className="rounded-lg border border-[#650D20] bg-[#140A0E] p-3 space-y-2 text-xs">
              <div className="font-semibold text-[#F5EFF1]">
                Resumo antes de restaurar
              </div>
              <div className="text-[#D8CFD2] tabular-nums">
                Obras: {inspected.manifest.workCount} · Arquivos de mídia:{' '}
                {inspected.mediaCount}
              </div>
              <div
                className={
                  inspected.checksumValid ? 'text-emerald-400' : 'text-amber-400'
                }
              >
                Integridade SHA-256:{' '}
                {inspected.checksumValid ? 'Verificada' : 'Alterada'}
              </div>
              <label className="flex items-center gap-2 text-[#D8CFD2] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="accent-[#E5092D]"
                />
                <span>Substituir obras já existentes com o mesmo ID</span>
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={handleApplyRestore}
                className="w-full mt-2 py-2 rounded-lg bg-[#E5092D] text-white font-semibold"
              >
                Confirmar Restauração
              </button>
            </div>
          )}
        </section>
      </div>

      {message && (
        <div className="rounded-lg border border-[#650D20] bg-[#140A0E] p-3 text-xs text-[#F5EFF1] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#E5092D]" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-3 text-xs text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
