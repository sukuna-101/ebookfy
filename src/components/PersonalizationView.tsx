import React from 'react';
import {ImagePlus, Palette, RotateCcw} from 'lucide-react';
import {DEFAULT_THEME_CONFIG} from '../services/db';
import type {ThemeConfig, ThemeId} from '../types/ebookfy';
import {THEME_PRESETS} from '../utils/themes';

interface PersonalizationViewProps {
  themeConfig: ThemeConfig;
  onUpdateTheme: (config: ThemeConfig) => Promise<void>;
}

export const PersonalizationView: React.FC<PersonalizationViewProps> = ({
  themeConfig,
  onUpdateTheme,
}) => {
  const selectPreset = (id: ThemeId) => {
    const preset = THEME_PRESETS.find((p) => p.id === id);
    if (!preset) {
      onUpdateTheme({...themeConfig, activeTheme: 'personalizado'});
      return;
    }
    onUpdateTheme({
      ...themeConfig,
      activeTheme: id,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      backgroundColor: preset.backgroundColor,
    });
  };

  const handleWallpaper = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateTheme({...themeConfig, customWallpaperDataUrl: reader.result});
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative z-10 px-4 sm:px-6 pb-20 lg:pb-8 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-[#F5EFF1]">
            Personalização Visual
          </h1>
          <p className="text-xs text-[#A89DA2] mt-1">
            Alterações aplicadas em tempo real e salvas localmente no dispositivo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onUpdateTheme(DEFAULT_THEME_CONFIG)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#3E3136] text-xs text-[#D8CFD2] hover:border-[#E5092D]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Gótico</span>
        </button>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {THEME_PRESETS.map((preset) => {
          const active = themeConfig.activeTheme === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => selectPreset(preset.id)}
              className={`text-left rounded-xl border p-4 transition ${
                active
                  ? 'border-[#E5092D] bg-[#180A0F] shadow-[0_0_20px_rgba(229,9,45,0.22)]'
                  : 'border-[#3E3136] bg-[#0B080A] hover:border-[#E5092D]/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#F5EFF1]">
                  {preset.name}
                </span>
                <div className="flex items-center gap-1">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20"
                    style={{backgroundColor: preset.primaryColor}}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20"
                    style={{backgroundColor: preset.secondaryColor}}
                  />
                </div>
              </div>
              <p className="text-xs text-[#A89DA2]">{preset.description}</p>
            </button>
          );
        })}
      </div>

      {/* Fine-grained controls */}
      <section className="rounded-xl border border-[#4A1522] bg-[#0B080A]/92 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#E5092D]" />
          <h2 className="text-sm font-semibold text-[#F5EFF1]">
            Ajustes Avançados (Modo Personalizado)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <label className="flex items-center justify-between p-3 rounded-lg border border-[#3E3136] bg-[#120C0E]">
            <span>Cor principal</span>
            <input
              type="color"
              value={themeConfig.primaryColor}
              onChange={(e) =>
                onUpdateTheme({
                  ...themeConfig,
                  activeTheme: 'personalizado',
                  primaryColor: e.target.value,
                })
              }
              className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-lg border border-[#3E3136] bg-[#120C0E]">
            <span>Cor secundária</span>
            <input
              type="color"
              value={themeConfig.secondaryColor}
              onChange={(e) =>
                onUpdateTheme({
                  ...themeConfig,
                  activeTheme: 'personalizado',
                  secondaryColor: e.target.value,
                })
              }
              className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-lg border border-[#3E3136] bg-[#120C0E]">
            <span>Fundo principal</span>
            <input
              type="color"
              value={themeConfig.backgroundColor}
              onChange={(e) =>
                onUpdateTheme({
                  ...themeConfig,
                  activeTheme: 'personalizado',
                  backgroundColor: e.target.value,
                })
              }
              className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <label className="block">
            <div className="flex justify-between text-[#D8CFD2] mb-1">
              <span>Opacidade dos cartões</span>
              <span className="tabular-nums">
                {Math.round(themeConfig.surfaceOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.65}
              max={1}
              step={0.02}
              value={themeConfig.surfaceOpacity}
              onChange={(e) =>
                onUpdateTheme({
                  ...themeConfig,
                  surfaceOpacity: Number(e.target.value),
                })
              }
              className="w-full accent-[#E5092D]"
            />
          </label>

          <label className="block">
            <div className="flex justify-between text-[#D8CFD2] mb-1">
              <span>Escala de fonte</span>
              <span className="tabular-nums">
                {Math.round(themeConfig.fontScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.9}
              max={1.15}
              step={0.02}
              value={themeConfig.fontScale}
              onChange={(e) =>
                onUpdateTheme({...themeConfig, fontScale: Number(e.target.value)})
              }
              className="w-full accent-[#E5092D]"
            />
          </label>
        </div>

        {/* Local Wallpaper Upload */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#390D18]">
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#4A1522] bg-[#140C0F] hover:border-[#E5092D] text-xs font-medium cursor-pointer">
            <ImagePlus className="w-4 h-4 text-[#E5092D]" />
            <span>Definir Wallpaper Local</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleWallpaper(e.target.files?.[0])}
            />
          </label>
          {themeConfig.customWallpaperDataUrl && (
            <button
              type="button"
              onClick={() =>
                onUpdateTheme({...themeConfig, customWallpaperDataUrl: null})
              }
              className="text-xs text-[#A89DA2] hover:text-[#FF173D]"
            >
              Remover wallpaper
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
