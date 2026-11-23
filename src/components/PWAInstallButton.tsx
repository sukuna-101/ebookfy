import React, {useState} from 'react';
import {Download, Smartphone, CheckCircle2, X} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled && variant === 'compact') {
    return null;
  }

  if (variant === 'card') {
    return (
      <div className="rounded-xl border border-[#4A1522] bg-[#100B0E]/95 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#390D18] border border-[#650D20] flex items-center justify-center shrink-0 text-[#FF173D]">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#F5EFF1]">
              Instalar Ebookfy no Celular ou PC (PWA)
            </h4>
            <p className="text-xs text-[#A89DA2] mt-0.5">
              {isInstalled
                ? 'Aplicativo instalado e operando em modo standalone 100% offline.'
                : 'Instale na tela inicial para abrir em tela cheia e ler mesmo sem internet.'}
            </p>
          </div>
        </div>
        {isInstalled ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F5EFF1] whitespace-nowrap shrink-0">
            <CheckCircle2 className="w-4 h-4 text-[#E5092D]" />
            Instalado
          </span>
        ) : (
          <button
            type="button"
            onClick={() => (isInstallable ? install() : setShowGuide(true))}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#8E0A24] to-[#E5092D] text-white text-xs font-semibold hover:brightness-110 transition whitespace-nowrap shrink-0 shadow-[0_0_16px_rgba(229,9,45,0.28)]"
          >
            Instalar PWA
          </button>
        )}

        {showGuide && (
          <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuide(false)} />
        )}
      </div>
    );
  }

  return (
    <>
      {isInstallable ? (
        <button
          type="button"
          onClick={install}
          aria-label="Instalar aplicativo Ebookfy"
          className="h-9 px-3 rounded-full border border-[#650D20] bg-[#160A0E] text-xs font-medium text-[#F5EFF1] hover:border-[#E5092D] hover:text-white transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-[#E5092D]" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>
      ) : isIOS ? (
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          aria-label="Como instalar no iPhone ou iPad"
          className="h-9 px-3 rounded-full border border-[#4A1522] bg-[#100B0E] text-xs font-medium text-[#F5EFF1] hover:border-[#E5092D] transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#E5092D]" />
          <span className="hidden sm:inline">Instalar iOS</span>
        </button>
      ) : null}

      {showGuide && (
        <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuide(false)} />
      )}
    </>
  );
};

const InstallGuideModal: React.FC<{isIOS: boolean; onClose: () => void}> = ({
  isIOS,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
    <div className="w-full max-w-md rounded-xl border border-[#650D20] bg-[#100B0E] p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-[#F5EFF1]">
          Instalar Ebookfy como App (PWA)
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar guia de instalação"
          className="p-1.5 rounded-lg text-[#A89DA2] hover:text-white hover:bg-[#390D18]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {isIOS ? (
        <ol className="text-sm text-[#A89DA2] space-y-2 list-decimal pl-4">
          <li>Toque no ícone de <strong className="text-[#F5EFF1]">Compartilhar</strong> na barra do Safari.</li>
          <li>Role para baixo e escolha <strong className="text-[#F5EFF1]">Adicionar à Tela de Início</strong>.</li>
          <li>Toque em <strong className="text-[#F5EFF1]">Adicionar</strong> para abrir em tela cheia offline.</li>
        </ol>
      ) : (
        <ol className="text-sm text-[#A89DA2] space-y-2 list-decimal pl-4">
          <li>No Chrome/Edge (Android ou Windows), abra o menu do navegador (<strong className="text-[#F5EFF1]">⋮</strong>).</li>
          <li>Selecione <strong className="text-[#F5EFF1]">Instalar aplicativo</strong> ou <strong className="text-[#F5EFF1]">Adicionar à tela inicial</strong>.</li>
          <li>Após instalado, toda sua biblioteca local continuará acessível offline.</li>
        </ol>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full py-2.5 rounded-lg bg-[#390D18] hover:bg-[#650D20] text-sm font-medium text-white transition"
      >
        Entendi
      </button>
    </div>
  </div>
);
