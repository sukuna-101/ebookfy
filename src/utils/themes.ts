import type {ThemeConfig, ThemeId, WorkCategory} from '../types/ebookfy';

export interface ThemePreset {
  id: ThemeId;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  borderColor: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'gotico',
    name: 'Gótico',
    description: 'Preto profundo, bordô e rosas vermelhas Dark Fantasy.',
    primaryColor: '#E5092D',
    secondaryColor: '#650D20',
    backgroundColor: '#080607',
    surfaceColor: '#100B0E',
    borderColor: '#4A1522',
  },
  {
    id: 'dark_romance',
    name: 'Dark Romance',
    description: 'Contraste romântico em vinho escuro e veludo carmesim.',
    primaryColor: '#D91642',
    secondaryColor: '#4D0C1D',
    backgroundColor: '#0A0608',
    surfaceColor: '#130A0E',
    borderColor: '#591427',
  },
  {
    id: 'blood_red',
    name: 'Blood Red',
    description: 'Vermelho sangue intenso com sombras densas.',
    primaryColor: '#FF173D',
    secondaryColor: '#7A0A1E',
    backgroundColor: '#0C0506',
    surfaceColor: '#16080B',
    borderColor: '#7A1025',
  },
  {
    id: 'pure_black',
    name: 'Pure Black',
    description: 'OLED preto absoluto para máxima economia de bateria.',
    primaryColor: '#E5092D',
    secondaryColor: '#390D18',
    backgroundColor: '#000000',
    surfaceColor: '#070708',
    borderColor: '#2B1117',
  },
  {
    id: 'crimson_glass',
    name: 'Crimson Glass',
    description: 'Painéis translúcidos com desfoque atmosférico.',
    primaryColor: '#FF173D',
    secondaryColor: '#650D20',
    backgroundColor: '#090608',
    surfaceColor: '#120C10',
    borderColor: '#5B1A2A',
  },
  {
    id: 'minimal_dark',
    name: 'Minimal Dark',
    description: 'Estética minimalista limpa com acento carmesim discreto.',
    primaryColor: '#C81E3A',
    secondaryColor: '#3B141D',
    backgroundColor: '#0C0B0C',
    surfaceColor: '#141213',
    borderColor: '#2E2629',
  },
];

export function applyThemeToDocument(config: ThemeConfig): void {
  const root = document.documentElement;
  const preset = THEME_PRESETS.find((p) => p.id === config.activeTheme);
  const primary = config.activeTheme === 'personalizado' ? config.primaryColor : (preset?.primaryColor ?? config.primaryColor);
  const secondary = config.activeTheme === 'personalizado' ? config.secondaryColor : (preset?.secondaryColor ?? config.secondaryColor);
  const bg = config.activeTheme === 'personalizado' ? config.backgroundColor : (preset?.backgroundColor ?? config.backgroundColor);

  root.style.setProperty('--ef-bg', bg);
  root.style.setProperty('--ef-surface', preset?.surfaceColor ?? '#100B0E');
  root.style.setProperty('--ef-primary', primary);
  root.style.setProperty('--ef-secondary', secondary);
  root.style.setProperty('--ef-border', preset?.borderColor ?? secondary);
  root.style.setProperty('--ef-blur', `${config.blurIntensity}px`);
  root.style.setProperty('--ef-radius', `${config.borderRadius}px`);
  root.style.setProperty('--ef-surface-opacity', `${config.surfaceOpacity}`);
  root.style.setProperty('--ef-font-scale', `${config.fontScale}`);
}

export const CATEGORY_META: Record<
  WorkCategory,
  {label: string; shortDesc: string}
> = {
  mangas: {label: 'Mangás', shortDesc: 'Leitura oriental RTL/LTR'},
  manhwas: {label: 'Manhwas', shortDesc: 'Rolagem vertical contínua'},
  manhuas: {label: 'Manhuas', shortDesc: 'Colorido por página ou vertical'},
  webtoons: {label: 'Webtoons', shortDesc: 'Episódios em tira contínua'},
  hqs: {label: 'HQs', shortDesc: 'Quadrinhos ocidentais'},
  livros: {label: 'Livros', shortDesc: 'EPUB, TXT e novelas'},
  pdfs: {label: 'PDFs', shortDesc: 'Documentos paginados'},
  documentos: {label: 'Documentos', shortDesc: 'DOCX, ODT e RTF'},
  outros: {label: 'Outros', shortDesc: 'Arquivos locais diversos'},
};
