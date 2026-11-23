import React from 'react';
import {
  BookOpen,
  Clock,
  Crown,
  Download,
  Folder,
  HardDrive,
  Heart,
  Home,
  Menu,
  Palette,
  Settings,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';
import {THEME_ASSETS} from '../assets/themeAssets';
import type {NavSection, UserProfile} from '../types/ebookfy';
import {EbookfyBookLogo, GothicCorner} from './GothicDecorations';

interface SidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  userProfile: UserProfile;
  mobileDrawerOpen: boolean;
  onToggleMobileDrawer: (open: boolean) => void;
}

const PRIMARY_NAV: Array<{id: NavSection; label: string; icon: React.FC<{className?: string}>}> = [
  {id: 'inicio', label: 'Início', icon: Home},
  {id: 'biblioteca', label: 'Biblioteca', icon: BookOpen},
  {id: 'favoritos', label: 'Favoritos', icon: Heart},
  {id: 'historico', label: 'Histórico', icon: Clock},
  {id: 'colecoes', label: 'Coleções', icon: Folder},
];

const SECONDARY_NAV: Array<{id: NavSection; label: string; icon: React.FC<{className?: string}>}> = [
  {id: 'importar', label: 'Importar', icon: Download},
  {id: 'armazenamento', label: 'Armazenamento', icon: HardDrive},
  {id: 'backup', label: 'Backup & Restore', icon: Shield},
  {id: 'personalizacao', label: 'Personalização', icon: Palette},
  {id: 'seguranca', label: 'Segurança', icon: ShieldCheck},
  {id: 'configuracoes', label: 'Configurações', icon: Settings},
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  userProfile,
  mobileDrawerOpen,
  onToggleMobileDrawer,
}) => {
  const renderNavItem = (item: {
    id: NavSection;
    label: string;
    icon: React.FC<{className?: string}>;
  }) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onNavigate(item.id);
          onToggleMobileDrawer(false);
        }}
        className={`group w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all duration-150 whitespace-nowrap ${
          isActive
            ? 'bg-gradient-to-r from-[#B90D2E] via-[#7A0920] to-[#3B0611] text-white font-medium border border-[#FF173D]/70 shadow-[0_0_16px_rgba(229,9,45,0.28)]'
            : 'text-[#D8CFD2] hover:text-white hover:bg-[#390D18]/45 border border-transparent'
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive
                ? 'text-white'
                : 'text-[#A89DA2] group-hover:text-[#FF173D]'
            }`}
          />
          <span className="truncate">{item.label}</span>
        </span>
        {isActive && (
          <span aria-hidden="true" className="text-[11px] text-white/80 ml-1">
            ›
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="relative flex flex-col h-full w-full bg-[#080607]/95 border-r border-[#4A1522]/65 px-3.5 py-4 select-none">
      <GothicCorner position="tl" />
      <GothicCorner position="tr" />
      <GothicCorner position="bl" />
      <GothicCorner position="br" />

      {/* Brand Logo */}
      <button
        type="button"
        onClick={() => onNavigate('inicio')}
        className="flex flex-col items-center text-center pt-1 pb-4 mb-1 focus:outline-none group"
      >
        <EbookfyBookLogo className="w-12 h-10 mb-1 transition-transform duration-200 group-hover:scale-105" />
        <div className="font-calligraphic text-[34px] leading-none tracking-wide">
          <span className="text-[#F5EFF1]">Ebook</span>
          <span className="text-[#E5092D]">fy</span>
        </div>
        <span className="text-[10px] text-[#A89DA2] tracking-wide mt-0.5">
          Sua biblioteca. Suas regras.
        </span>
      </button>

      {/* Primary Navigation */}
      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto space-y-1 pr-0.5">
        {PRIMARY_NAV.map(renderNavItem)}

        <div className="my-2.5 border-t border-[#4A1522]/60" />

        {SECONDARY_NAV.map(renderNavItem)}
      </nav>

      {/* User Profile Card */}
      <button
        type="button"
        onClick={() => {
          onNavigate('configuracoes');
          onToggleMobileDrawer(false);
        }}
        className="mt-3 w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0C080A] border border-[#4A1522]/80 hover:border-[#E5092D]/70 transition text-left"
      >
        <div className="w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-[#650D20] to-[#E5092D] shrink-0">
          <img
            src={userProfile.avatarDataUrl || THEME_ASSETS.avatarGabriel}
            alt={`Avatar de ${userProfile.name}`}
            referrerPolicy="no-referrer"
            className="w-full h-full rounded-full object-cover bg-[#080607]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-[#F5EFF1] truncate leading-tight">
            {userProfile.name}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-[#E5092D] leading-tight mt-0.5">
            <span>{userProfile.tierLabel}</span>
            <Crown className="w-3 h-3 fill-[#D97706] text-[#F59E0B]" />
          </div>
        </div>
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (~19% proportion: 224px-240px) */}
      <aside className="hidden lg:block w-[224px] xl:w-[238px] shrink-0 h-screen sticky top-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => onToggleMobileDrawer(false)}
          />
          <div className="relative z-10 w-[264px] max-w-[82vw] h-full">
            <button
              type="button"
              onClick={() => onToggleMobileDrawer(false)}
              aria-label="Fechar menu lateral"
              className="absolute top-3 right-3 z-30 p-2 rounded-lg bg-[#160A0E] text-[#F5EFF1] border border-[#4A1522]"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Mobile Bottom Thumb Bar (<= 15% height, >= 44px touch targets) */}
      <nav
        aria-label="Navegação rápida móvel"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 pb-safe bg-[#080607]/95 backdrop-blur-md border-t border-[#4A1522]/80 grid grid-cols-5 items-center px-1"
      >
        {[
          {id: 'inicio' as NavSection, label: 'Início', icon: Home},
          {id: 'biblioteca' as NavSection, label: 'Acervo', icon: BookOpen},
          {id: 'importar' as NavSection, label: 'Importar', icon: Download},
          {id: 'personalizacao' as NavSection, label: 'Temas', icon: Palette},
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${
                active ? 'text-[#FF173D]' : 'text-[#A89DA2]'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onToggleMobileDrawer(true)}
          aria-label="Abrir menu completo"
          className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[#A89DA2] hover:text-white"
        >
          <Menu className="w-[18px] h-[18px]" />
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
};
