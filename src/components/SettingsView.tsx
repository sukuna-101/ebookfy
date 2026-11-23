import React, {useState} from 'react';
import {CheckCircle2, ImagePlus, Shield, User} from 'lucide-react';
import {THEME_ASSETS} from '../assets/themeAssets';
import {createThumbnailDataUrl} from '../services/thumbnails';
import type {
  BookReaderPreferences,
  ImageReaderPreferences,
  UserProfile,
} from '../types/ebookfy';
import {PWAInstallButton} from './PWAInstallButton';

interface SettingsViewProps {
  profile: UserProfile;
  imagePrefs: ImageReaderPreferences;
  bookPrefs: BookReaderPreferences;
  onUpdateProfile: (p: UserProfile) => Promise<void>;
  onUpdateImagePrefs: (p: ImageReaderPreferences) => Promise<void>;
  onUpdateBookPrefs: (p: BookReaderPreferences) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  imagePrefs,
  bookPrefs,
  onUpdateProfile,
  onUpdateImagePrefs,
  onUpdateBookPrefs,
}) => {
  const [name, setName] = useState(profile.name);
  const [tierLabel, setTierLabel] = useState(profile.tierLabel);
  const [saved, setSaved] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateProfile({
      ...profile,
      name: name.trim() || 'Gabriel',
      tierLabel: tierLabel.trim() || 'Premium',
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const handleAvatar = async (file: File | undefined) => {
    if (!file) return;
    const url = await createThumbnailDataUrl(file, 240, 240);
    if (url) {
      await onUpdateProfile({...profile, avatarDataUrl: url});
    }
  };

  return (
    <div className="relative z-10 px-4 sm:px-6 pb-20 lg:pb-8 space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-[#F5EFF1]">Configurações</h1>
        <p className="text-xs text-[#A89DA2] mt-1">
          Perfil local, aplicativo instalável (PWA) e preferências padrão dos leitores.
        </p>
      </div>

      {/* PWA Install Card */}
      <PWAInstallButton variant="card" />

      {/* Local User Profile */}
      <section className="rounded-xl border border-[#4A1522] bg-[#0B080A]/92 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-[#E5092D]" />
          <h2 className="text-sm font-semibold text-[#F5EFF1]">Perfil Local</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <label className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#E5092D] cursor-pointer shrink-0 group">
            <img
              src={profile.avatarDataUrl || THEME_ASSETS.avatarGabriel}
              alt={profile.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <span className="absolute inset-0 bg-black/65 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <ImagePlus className="w-4 h-4 text-white" />
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleAvatar(e.target.files?.[0])}
            />
          </label>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <div>
              <label className="block text-xs text-[#D8CFD2] mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#120C0E] border border-[#3E3136] text-xs text-[#F5EFF1]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#D8CFD2] mb-1">Rótulo</label>
              <input
                type="text"
                value={tierLabel}
                onChange={(e) => setTierLabel(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#120C0E] border border-[#3E3136] text-xs text-[#F5EFF1]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="h-9 px-4 rounded-lg bg-[#E5092D] text-white text-xs font-semibold whitespace-nowrap"
          >
            Salvar Perfil
          </button>
        </form>
        {saved && (
          <div className="text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Perfil atualizado localmente.</span>
          </div>
        )}
      </section>

      {/* Reader Defaults */}
      <section className="rounded-xl border border-[#4A1522] bg-[#0B080A]/92 p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#F5EFF1]">
          Padrões dos Leitores
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[#D8CFD2] mb-1">
              Modo padrão (Mangá/Manhwa)
            </label>
            <select
              value={imagePrefs.mode}
              onChange={(e) =>
                onUpdateImagePrefs({
                  ...imagePrefs,
                  mode: e.target.value as ImageReaderPreferences['mode'],
                })
              }
              className="w-full h-9 px-3 rounded-lg bg-[#120C0E] border border-[#3E3136] text-[#F5EFF1]"
            >
              <option value="vertical">Vertical Contínuo (Manhwa/Webtoon)</option>
              <option value="single">Página Única (Mangá/HQ)</option>
              <option value="double">Página Dupla</option>
              <option value="horizontal">Horizontal</option>
            </select>
          </div>

          <div>
            <label className="block text-[#D8CFD2] mb-1">
              Tema padrão de Livros (EPUB/TXT)
            </label>
            <select
              value={bookPrefs.theme}
              onChange={(e) =>
                onUpdateBookPrefs({
                  ...bookPrefs,
                  theme: e.target.value as BookReaderPreferences['theme'],
                })
              }
              className="w-full h-9 px-3 rounded-lg bg-[#120C0E] border border-[#3E3136] text-[#F5EFF1]"
            >
              <option value="dark_comfort">Fundo Preto + Letras Brancas (Conforto)</option>
              <option value="light">Modo Claro</option>
              <option value="sepia">Sépia</option>
              <option value="gothic">Gótico</option>
            </select>
          </div>
        </div>
      </section>

      {/* Privacy Guarantee */}
      <div className="rounded-xl border border-[#3E3136] bg-[#0B080A] p-4 flex items-start gap-3 text-xs text-[#A89DA2]">
        <Shield className="w-4 h-4 text-[#E5092D] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Privacidade garantida: o Ebookfy opera 100% no seu dispositivo sem envio de arquivos, sem contas externas, sem servidores remotos e sem rastreamento.
        </p>
      </div>
    </div>
  );
};
