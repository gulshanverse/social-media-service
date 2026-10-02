import type { ThemeInput } from './index';
import { normalizeTheme } from './index';

type Rgb = { r: number; g: number; b: number; a: number };
export type ContrastResult = {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
  status: 'PASS' | 'WARNING' | 'FAIL';
};
export type ContrastPair = ContrastResult & { id: string; label: string; foreground: string; background: string };
const NAMED: Record<string, [number, number, number]> = { black: [0, 0, 0], white: [255, 255, 255], red: [255, 0, 0], blue: [0, 0, 255], green: [0, 128, 0], transparent: [0, 0, 0] };
function channel(value: string) { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.min(255, n <= 1 ? n * 255 : n)) : NaN; }
export function parseSupportedColor(value: unknown): Rgb | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  if (NAMED[text]) return { r: NAMED[text][0], g: NAMED[text][1], b: NAMED[text][2], a: text === 'transparent' ? 0 : 1 };
  const hex = text.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const raw = hex[1];
    if (![3, 4, 6, 8].includes(raw.length)) return null;
    const expanded = raw.length <= 4 ? raw.split('').map((char) => char + char).join('') : raw;
    return { r: parseInt(expanded.slice(0, 2), 16), g: parseInt(expanded.slice(2, 4), 16), b: parseInt(expanded.slice(4, 6), 16), a: expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1 };
  }
  const rgb = text.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
  if (rgb) { const [r, g, b] = [channel(rgb[1]), channel(rgb[2]), channel(rgb[3])]; const a = rgb[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(rgb[4]))); return [r, g, b, a].every(Number.isFinite) ? { r, g, b, a } : null; }
  return null;
}
function composite(foreground: Rgb, background: Rgb): Rgb | null {
  if (background.a < 1) return null;
  const a = foreground.a + background.a * (1 - foreground.a);
  if (a <= 0) return null;
  return { r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / a, g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / a, b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / a, a: 1 };
}
function luminanceChannel(value: number) { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
function rgbLuminance(color: Rgb) { return 0.2126 * luminanceChannel(color.r) + 0.7152 * luminanceChannel(color.g) + 0.0722 * luminanceChannel(color.b); }
export function relativeLuminance(color: unknown): number | null { const parsed = parseSupportedColor(color); if (!parsed || parsed.a < 1) return null; return 0.2126 * luminanceChannel(parsed.r) + 0.7152 * luminanceChannel(parsed.g) + 0.0722 * luminanceChannel(parsed.b); }
export function contrastRatio(foreground: unknown, background: unknown): number | null {
  const fg = parseSupportedColor(foreground); const bg = parseSupportedColor(background); if (!fg || !bg) return null;
  const composed = composite(fg, bg); if (!composed) return null;
  const l1 = 0.2126 * luminanceChannel(composed.r) + 0.7152 * luminanceChannel(composed.g) + 0.0722 * luminanceChannel(composed.b);
  const l2 = bg.a === 1 ? rgbLuminance(bg) : null; if (l2 === null) return null;
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
export function evaluateContrast(foreground: unknown, background: unknown): ContrastResult | null {
  const ratio = contrastRatio(foreground, background); if (ratio === null) return null;
  const aaNormal = ratio >= 4.5, aaLarge = ratio >= 3, aaaNormal = ratio >= 7, aaaLarge = ratio >= 4.5;
  return { ratio, aaNormal, aaLarge, aaaNormal, aaaLarge, status: aaaNormal ? 'PASS' : aaNormal ? 'WARNING' : 'FAIL' };
}
function token(theme: ReturnType<typeof normalizeTheme>, key: string, fallback: string) { return theme.visualTokens[key] || fallback; }
export function analyzeThemeContrast(input: ThemeInput): ContrastPair[] {
  const theme = normalizeTheme(input); const pairs: Array<[string, string, string, string]> = [
    ['primary-background', 'Primary text / Background', token(theme, 'primaryText', theme.textColor), theme.background],
    ['secondary-background', 'Secondary text / Background', token(theme, 'secondaryText', theme.textColor), theme.background],
    ['muted-background', 'Muted text / Background', token(theme, 'mutedText', theme.textColor), theme.background],
    ['heading-background', 'Heading text / Background', token(theme, 'headingText', theme.textColor), theme.background],
    ['link-background', 'Link / Background', token(theme, 'linkText', theme.accentColor), theme.background],
    ['button', 'Button text / Button background', token(theme, 'buttonText', theme.textColor), token(theme, 'buttonBackground', theme.accentColor)],
    ['input', 'Input text / Input background', token(theme, 'primaryText', theme.textColor), token(theme, 'input', theme.background)],
    ['placeholder', 'Placeholder / Input background', token(theme, 'placeholderText', theme.textColor), token(theme, 'input', theme.background)],
    ['card', 'Card text / Card background', token(theme, 'primaryText', theme.textColor), token(theme, 'card', theme.background)],
    ['primary-surface', 'Primary text / Surface', token(theme, 'primaryText', theme.textColor), token(theme, 'surface', theme.background)],
    ['heading-surface', 'Heading text / Surface', token(theme, 'headingText', theme.textColor), token(theme, 'surface', theme.background)],
  ];
  return pairs.flatMap(([id, label, foreground, background]) => { const result = evaluateContrast(foreground, background); return result ? [{ id, label, foreground, background, ...result }] : []; });
}
