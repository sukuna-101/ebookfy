import React from 'react';
import {
  Download,
  Filter,
  Menu,
  Moon,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type {NavSection} from '../types/ebookfy';
import {PWAInstallButton} from './PWAInstallButton';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSection: (section: NavSection) => void;
  onOpenFilterLibrary: () => void;
  onToggleMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSection,
  onOpenFilterLibrary,
  onToggleMobileMenu,
}) => {
  return (
    <header className="relative z-10 flex items-center justify-between gap-3 pt-3.5 pb-3 px-4 sm:px-6">
      {/* Mobile Menu Trigger + Search Pill */}
      <div className="flex items-center gap-2.5 flex-1 max-w-[560px]">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Abrir menu lateral"
          className="lg:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full border border-[#4A1522] bg-[#0B080A] text-[#F5EFF1]"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A89DA2]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Pesquisar na sua biblioteca"
            placeholder="Pesquisar na sua biblioteca..."
            className="w-full h-10 pl-10 pr-8 rounded-full bg-[#0A0809]/95 border border-[#3E3136] text-[13px] text-[#F5EFF1] placeholder:text-[#A89DA2] focus:outline-none focus:border-[#E5092D] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Limpar pesquisa"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A89DA2] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Circular Action Buttons matching reference */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden md:block">
          <PWAInstallButton variant="compact" />
        </div>

        <button
          type="button"
          onClick={onOpenFilterLibrary}
          title="Filtrar biblioteca"
          aria-label="Filtrar obras na biblioteca"
          className="w-10 h-10 rounded-full border border-[#3A2D32] bg-[#0B080A] hover:border-[#E5092D] text-[#F5EFF1] flex items-center justify-center transition"
        >
          <Filter className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onOpenSection('importar')}
          title="Importar arquivos"
          aria-label="Importar arquivos locais"
          className="w-10 h-10 rounded-full border border-[#3A2D32] bg-[#0B080A] hover:border-[#E5092D] text-[#F5EFF1] flex items-center justify-center transition"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onOpenSection('configuracoes')}
          title="Ajustes do sistema"
          aria-label="Abrir configurações"
          className="hidden sm:flex w-10 h-10 rounded-full border border-[#3A2D32] bg-[#0B080A] hover:border-[#E5092D] text-[#F5EFF1] items-center justify-center transition"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onOpenSection('personalizacao')}
          title="Tema Gótico e Personalização"
          aria-label="Personalizar tema"
          className="w-10 h-10 rounded-full border border-[#E5092D]/80 bg-[#14080C] hover:bg-[#390D18] text-[#FF173D] flex items-center justify-center transition shadow-[0_0_12px_rgba(229,9,45,0.22)]"
        >
          <Moon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
