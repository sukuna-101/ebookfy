import React, {useState} from 'react';
import {CheckCircle2, KeyRound, Lock, ShieldCheck, Unlock} from 'lucide-react';
import type {SecuritySettings} from '../types/ebookfy';
import {
  generateRecoveryCode,
  generateSaltHex,
  hashPasswordPBKDF2,
  sha256Hex,
  verifyPasswordPBKDF2,
} from '../utils/cryptoSecurity';

interface SecurityViewProps {
  security: SecuritySettings;
  onUpdateSecurity: (next: SecuritySettings) => Promise<void>;
}

export const SecurityView: React.FC<SecurityViewProps> = ({
  security,
  onUpdateSecurity,
}) => {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleEnableOrChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (security.lockEnabled && security.passwordHash && security.passwordSalt) {
      const ok = await verifyPasswordPBKDF2(
        currentPw,
        security.passwordSalt,
        security.passwordHash,
      );
      if (!ok) {
        setError('Senha atual incorreta.');
        return;
      }
    }

    if (newPw.length < 4) {
      setError('A senha deve ter pelo menos 4 caracteres.');
      return;
    }
    if (newPw !== confirmPw) {
      setError('As senhas não conferem.');
      return;
    }

    const salt = generateSaltHex();
    const hash = await hashPasswordPBKDF2(newPw, salt);
    const code = generateRecoveryCode();
    const codeHash = await sha256Hex(code);

    await onUpdateSecurity({
      ...security,
      lockEnabled: true,
      passwordHash: hash,
      passwordSalt: salt,
      recoveryCodeHash: codeHash,
    });
    sessionStorage.setItem('ebookfy_unlocked', '1');
    setRecoveryCode(code);
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setSuccess('Bloqueio por senha ativado com hash PBKDF2 local.');
  };

  const handleDisable = async () => {
    setError('');
    setSuccess('');
    if (security.passwordHash && security.passwordSalt) {
      const ok = await verifyPasswordPBKDF2(
        currentPw,
        security.passwordSalt,
        security.passwordHash,
      );
      if (!ok) {
        setError('Informe a senha atual para desativar o bloqueio.');
        return;
      }
    }
    await onUpdateSecurity({
      lockEnabled: false,
      passwordHash: null,
      passwordSalt: null,
      inactivityMinutes: 0,
      recoveryCodeHash: null,
    });
    setCurrentPw('');
    setSuccess('Bloqueio por senha desativado.');
  };

  return (
    <div className="relative z-10 px-4 sm:px-6 pb-20 lg:pb-8 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-[#F5EFF1]">
          Segurança e Bloqueio Local
        </h1>
        <p className="text-xs text-[#A89DA2] mt-1">
          Proteção opcional armazenada exclusivamente com hash PBKDF2-HMAC-SHA256 no dispositivo. Nunca salvamos senhas em texto puro.
        </p>
      </div>

      <div className="rounded-xl border border-[#4A1522] bg-[#0B080A]/92 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {security.lockEnabled ? (
              <Lock className="w-5 h-5 text-[#E5092D]" />
            ) : (
              <Unlock className="w-5 h-5 text-[#A89DA2]" />
            )}
            <div>
              <div className="text-sm font-semibold text-[#F5EFF1]">
                Status do Bloqueio: {security.lockEnabled ? 'Ativo' : 'Desativado'}
              </div>
              <div className="text-xs text-[#A89DA2]">
                Exigido apenas ao iniciar o app novamente ou após inatividade configurada.
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleEnableOrChange} className="space-y-3 pt-2 border-t border-[#390D18]">
          {security.lockEnabled && (
            <div>
              <label className="block text-xs text-[#D8CFD2] mb-1">
                Senha atual
              </label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#120C0E] border border-[#3E3136] text-xs text-[#F5EFF1]"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#D8CFD2] mb-1">
                {security.lockEnabled ? 'Nova senha' : 'Criar senha'}
              </label>
              <input
                type="password"
                required
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#120C0E] border border-[#3E3136] text-xs text-[#F5EFF1]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#D8CFD2] mb-1">
                Confirmar senha
              </label>
              <input
                type="password"
                required
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#120C0E] border border-[#3E3136] text-xs text-[#F5EFF1]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#D8CFD2] mb-1">
              Bloqueio por inatividade
            </label>
            <select
              value={security.inactivityMinutes}
              onChange={(e) =>
                onUpdateSecurity({
                  ...security,
                  inactivityMinutes: Number(e.target.value),
                })
              }
              className="w-full h-9 px-3 rounded-lg bg-[#120C0E] border border-[#3E3136] text-xs text-[#F5EFF1]"
            >
              <option value={0}>Somente ao abrir nova sessão</option>
              <option value={5}>Após 5 minutos sem atividade</option>
              <option value={15}>Após 15 minutos sem atividade</option>
              <option value={30}>Após 30 minutos sem atividade</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#E5092D] hover:bg-[#FF173D] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{security.lockEnabled ? 'Alterar senha' : 'Ativar bloqueio'}</span>
            </button>

            {security.lockEnabled && (
              <button
                type="button"
                onClick={handleDisable}
                className="px-4 py-2 rounded-lg border border-[#4A1522] text-xs text-[#F5EFF1] hover:border-[#E5092D]"
              >
                Desativar bloqueio
              </button>
            )}
          </div>
        </form>

        {recoveryCode && (
          <div className="rounded-lg border border-[#E5092D] bg-[#1A0A0F] p-3.5 text-xs space-y-1">
            <div className="font-semibold text-[#FF173D] flex items-center gap-1.5">
              <KeyRound className="w-4 h-4" />
              <span>Guarde seu código de recuperação local:</span>
            </div>
            <div className="font-mono text-sm text-white select-all">
              {recoveryCode}
            </div>
          </div>
        )}

        {error && <div className="text-xs text-amber-400">{error}</div>}
        {success && (
          <div className="text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}
      </div>
    </div>
  );
};
