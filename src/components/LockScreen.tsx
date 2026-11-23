import React, {useState} from 'react';
import {Lock} from 'lucide-react';
import type {SecuritySettings} from '../types/ebookfy';
import {sha256Hex, verifyPasswordPBKDF2} from '../utils/cryptoSecurity';
import {EbookfyBookLogo} from './GothicDecorations';

interface LockScreenProps {
  security: SecuritySettings;
  onUnlock: () => void;
  onRecoveryReset: () => Promise<void>;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  security,
  onUnlock,
  onRecoveryReset,
}) => {
  const [password, setPassword] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (recoveryMode) {
      const hash = await sha256Hex(recoveryInput.trim().toUpperCase());
      if (security.recoveryCodeHash && hash === security.recoveryCodeHash) {
        await onRecoveryReset();
        onUnlock();
      } else {
        setError('Código de recuperação inválido.');
      }
      return;
    }

    if (!security.passwordSalt || !security.passwordHash) {
      onUnlock();
      return;
    }

    const ok = await verifyPasswordPBKDF2(
      password,
      security.passwordSalt,
      security.passwordHash,
    );
    if (ok) {
      onUnlock();
    } else {
      setError('Senha incorreta.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#080607] flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#650D20] bg-[#100B0E] p-6 text-center space-y-5 shadow-[0_0_50px_rgba(229,9,45,0.18)]">
        <div className="flex flex-col items-center">
          <EbookfyBookLogo className="w-12 h-10 mb-1" />
          <div className="font-calligraphic text-4xl">
            <span className="text-[#F5EFF1]">Ebook</span>
            <span className="text-[#E5092D]">fy</span>
          </div>
          <p className="text-xs text-[#A89DA2] mt-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#E5092D]" />
            <span>Biblioteca protegida localmente</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          {recoveryMode ? (
            <div>
              <label className="block text-xs text-[#D8CFD2] mb-1">
                Código de recuperação local
              </label>
              <input
                type="text"
                autoFocus
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="w-full h-10 px-3 rounded-lg bg-[#080607] border border-[#4A1522] text-sm font-mono text-white"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-[#D8CFD2] mb-1">Senha</label>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha local..."
                className="w-full h-10 px-3 rounded-lg bg-[#080607] border border-[#4A1522] text-sm text-white focus:outline-none focus:border-[#E5092D]"
              />
            </div>
          )}

          {error && <div className="text-xs text-[#FF173D]">{error}</div>}

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#8E0A24] to-[#E5092D] text-white text-xs font-semibold"
          >
            {recoveryMode ? 'Desbloquear e remover senha' : 'Desbloquear Biblioteca'}
          </button>
        </form>

        {security.recoveryCodeHash && (
          <button
            type="button"
            onClick={() => {
              setRecoveryMode((r) => !r);
              setError('');
            }}
            className="text-[11px] text-[#A89DA2] hover:text-white underline"
          >
            {recoveryMode
              ? 'Voltar para login com senha'
              : 'Usar código de recuperação local'}
          </button>
        )}
      </div>
    </div>
  );
};
