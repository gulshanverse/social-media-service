import { normalizeTheme } from './index';
import type { Theme } from './index';

export const GARBA_DEFAULT_THEME_ID = 'garba-marigold-night';

export const garbaThemes: Theme[] = [
  {
    id: 'garba-marigold-night',
    name: 'Marigold Night',
    background: '#15102a',
    gradient: 'linear-gradient(135deg,#24103b,#7b285f)',
    textColor: '#fffaf0',
    accentColor: '#f7c85b',
    fontFamily: 'Space Grotesk',
    radius: '22px',
    borderStyle: 'solid',
    layoutVariant: 'garba-night',
    tokens: {
      card: '#24183dcc',
      border: '#f7c85b55',
      buttonVariant: 'gradient',
      shadowLarge: '0 24px 60px #10051f66',
    },
  },
  {
    id: 'garba-saffron-sky',
    name: 'Saffron Sky',
    background: '#3b1324',
    gradient: 'linear-gradient(135deg,#f97316,#db2777)',
    textColor: '#fff7ed',
    accentColor: '#fde68a',
    fontFamily: 'Poppins',
    radius: '22px',
    layoutVariant: 'garba-sunset',
    tokens: { card: '#7c2d45aa', border: '#fde68a66', buttonVariant: 'gradient' },
  },
  {
    id: 'garba-peacock',
    name: 'Peacock Blue',
    background: '#071d35',
    gradient: 'linear-gradient(135deg,#075985,#0f766e)',
    textColor: '#ecfeff',
    accentColor: '#67e8f9',
    fontFamily: 'Inter',
    radius: '22px',
    layoutVariant: 'garba-peacock',
    tokens: { card: '#0c314dcc', border: '#67e8f955', buttonVariant: 'solid' },
  },
  {
    id: 'garba-rose-dandiya',
    name: 'Rose Dandiya',
    background: '#2b1025',
    gradient: 'linear-gradient(135deg,#9d174d,#c026d3)',
    textColor: '#fff1f2',
    accentColor: '#f9a8d4',
    fontFamily: 'Poppins',
    radius: '28px',
    layoutVariant: 'garba-rose',
    tokens: { card: '#581c4dcc', border: '#f9a8d455', buttonVariant: 'gradient' },
  },
  {
    id: 'garba-emerald-raas',
    name: 'Emerald Raas',
    background: '#061b16',
    gradient: 'linear-gradient(135deg,#064e3b,#15803d)',
    textColor: '#ecfdf5',
    accentColor: '#fbbf24',
    fontFamily: 'Space Grotesk',
    radius: '18px',
    layoutVariant: 'garba-emerald',
    tokens: { card: '#064e3bcc', border: '#fbbf2455', buttonVariant: 'solid' },
  },
  {
    id: 'garba-lavender-leela',
    name: 'Lavender Leela',
    background: '#171229',
    gradient: 'linear-gradient(135deg,#312e81,#9333ea)',
    textColor: '#f5f3ff',
    accentColor: '#c4b5fd',
    fontFamily: 'Poppins',
    radius: '24px',
    layoutVariant: 'garba-lavender',
    tokens: { card: '#312e81cc', border: '#c4b5fd55', buttonVariant: 'glass' },
  },
  {
    id: 'garba-sunset-aarti',
    name: 'Sunset Aarti',
    background: '#2a1208',
    gradient: 'linear-gradient(135deg,#c2410c,#facc15)',
    textColor: '#fff7ed',
    accentColor: '#fef08a',
    fontFamily: 'Inter',
    radius: '20px',
    layoutVariant: 'garba-sunset',
    tokens: { card: '#7c2d12cc', border: '#fef08a66', buttonVariant: 'gradient' },
  },
  {
    id: 'garba-indigo-dhol',
    name: 'Indigo Dhol',
    background: '#0b102b',
    gradient: 'linear-gradient(135deg,#1e3a8a,#4338ca)',
    textColor: '#eef2ff',
    accentColor: '#93c5fd',
    fontFamily: 'Space Grotesk',
    radius: '18px',
    layoutVariant: 'garba-indigo',
    tokens: { card: '#1e3a8acc', border: '#93c5fd55', buttonVariant: 'outline' },
  },
];

export const GARBA_THEME_IDS = garbaThemes.map(({ id }) => id) as [string, ...string[]];
const garbaThemeMap = new Map(garbaThemes.map((theme) => [theme.id, theme]));

export function getGarbaTheme(themeId: unknown): Theme {
  const theme = garbaThemeMap.get(typeof themeId === 'string' ? themeId : '');
  return theme ?? garbaThemeMap.get(GARBA_DEFAULT_THEME_ID)!;
}

export function isGarbaThemeId(themeId: unknown): themeId is string {
  return typeof themeId === 'string' && garbaThemeMap.has(themeId);
}

export function validateGarbaThemes() {
  return garbaThemes.map((theme) => normalizeTheme({ ...theme, slug: theme.id }));
}
