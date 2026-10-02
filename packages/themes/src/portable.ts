import { normalizeTheme } from './index';
import type { ThemeInput, VisualThemeTokens } from './index';

export const THEME_SCHEMA_VERSION = 1;
export type PortableTheme = {
  schemaVersion: 1;
  type: 'theme';
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  category?: string;
  tags: string[];
  variant: string;
  mode: string;
  tokens: Record<string, string | number | boolean>;
};
export type ThemeImportDraft = PortableTheme & { normalized: ReturnType<typeof normalizeTheme> };
const META_TEXT = /^[^\r\n<>]{1,240}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function metadataText(value: unknown, field: string, max = 240) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > max || !META_TEXT.test(value)) throw new Error(`${field} is invalid.`);
  return value.trim();
}
function safeSlug(value: unknown) {
  if (typeof value !== 'string' || !SLUG.test(value) || value.length > 80) throw new Error('slug must use lowercase letters, numbers, and hyphens.');
  return value;
}
function safeMode(value: unknown) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(value)) throw new Error('mode is invalid.');
  return value;
}
function asTokens(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('tokens must be an object.');
  return value as Record<string, string | number | boolean>;
}
export function parseThemeImport(input: unknown): PortableTheme {
  let value: unknown = input;
  if (typeof input === 'string') {
    try { value = JSON.parse(input); } catch { throw new Error('Theme JSON is malformed.'); }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Theme import must be a JSON object.');
  const source = value as Record<string, unknown>;
  if (source.schemaVersion !== THEME_SCHEMA_VERSION || source.type !== 'theme') throw new Error('Unsupported theme schema version.');
  const name = metadataText(source.name, 'name', 120);
  if (!name) throw new Error('name is required.');
  const slug = safeSlug(source.slug);
  const tokens = asTokens(source.tokens);
  const tags = source.tags === undefined ? [] : source.tags;
  if (!Array.isArray(tags) || tags.length > 20 || tags.some((tag) => typeof tag !== 'string' || !META_TEXT.test(tag))) throw new Error('tags must be a list of safe text values.');
  return {
    schemaVersion: 1, type: 'theme', name, slug,
    description: metadataText(source.description, 'description'), icon: metadataText(source.icon, 'icon', 80),
    category: metadataText(source.category, 'category', 80), tags: tags.map((tag: string) => tag.trim()),
    variant: metadataText(source.variant ?? 'classic', 'variant', 40) || 'classic',
    mode: safeMode(source.mode ?? 'dark'), tokens,
  };
}
function themeInputFromPortable(portable: PortableTheme): ThemeInput {
  const tokens = portable.tokens;
  const visualTokens: VisualThemeTokens = {};
  const baseKeys = new Set(['background', 'gradient', 'textColor', 'accentColor', 'fontFamily', 'radius', 'borderStyle', 'logoVisibility', 'handleVisibility']);
  for (const [key, value] of Object.entries(tokens)) if (!baseKeys.has(key)) visualTokens[key] = String(value);
  const required = ['background', 'gradient', 'textColor', 'accentColor', 'fontFamily', 'radius'];
  for (const key of required) if (tokens[key] === undefined) throw new Error(`tokens.${key} is required.`);
  return {
    id: portable.slug, slug: portable.slug, name: portable.name,
    background: String(tokens.background), gradient: String(tokens.gradient), textColor: String(tokens.textColor), accentColor: String(tokens.accentColor), fontFamily: String(tokens.fontFamily), radius: tokens.radius as number,
    borderStyle: tokens.borderStyle as ThemeInput['borderStyle'], logoVisibility: tokens.logoVisibility as boolean | undefined, handleVisibility: tokens.handleVisibility as boolean | undefined,
    layoutVariant: portable.variant, tokens: visualTokens,
  };
}
export function normalizeImportedTheme(input: unknown): ThemeImportDraft {
  const portable = parseThemeImport(input);
  return { ...portable, normalized: normalizeTheme(themeInputFromPortable(portable)) };
}
export function exportPortableTheme(theme: ThemeInput & { mode?: string; description?: string | null; icon?: string | null; category?: string | null; tags?: unknown }): PortableTheme {
  const normalized = normalizeTheme(theme);
  const tokens: Record<string, string | number | boolean> = {
    background: normalized.background, gradient: normalized.gradient, textColor: normalized.textColor, accentColor: normalized.accentColor, fontFamily: normalized.fontFamily, radius: normalized.radius, borderStyle: normalized.borderStyle, logoVisibility: normalized.logoVisibility, handleVisibility: normalized.handleVisibility,
    ...normalized.visualTokens,
  };
  const tags = Array.isArray(theme.tags) && theme.tags.every((tag) => typeof tag === 'string') ? theme.tags as string[] : [];
  return {
    schemaVersion: 1, type: 'theme', name: normalized.name, slug: normalized.slug,
    ...(theme.description ? { description: metadataText(theme.description, 'description') } : {}),
    ...(theme.icon ? { icon: metadataText(theme.icon, 'icon', 80) } : {}),
    ...(theme.category ? { category: metadataText(theme.category, 'category', 80) } : {}),
    tags, variant: normalized.layoutVariant, mode: safeMode(theme.mode ?? 'dark'), tokens,
  };
}
export function portableToCreateInput(draft: ThemeImportDraft, slug = draft.slug) {
  const portable = { ...draft, slug };
  const normalized = normalizeImportedTheme(portable).normalized;
  return { slug, name: normalized.name, background: normalized.background, gradient: normalized.gradient, textColor: normalized.textColor, accentColor: normalized.accentColor, fontFamily: normalized.fontFamily, radius: normalized.radius, borderStyle: normalized.borderStyle, logoVisibility: normalized.logoVisibility, handleVisibility: normalized.handleVisibility, layoutVariant: normalized.layoutVariant, mode: draft.mode, status: 'DRAFT' as const, tokens: normalized.visualTokens, description: draft.description, icon: draft.icon, category: draft.category, tags: draft.tags };
}
const presetBase = { background: '#070a12', gradient: 'linear-gradient(135deg,#070a12,#101c3b)', textColor: '#ffffff', accentColor: '#00b8ff', fontFamily: 'Inter', radius: 28 };
function preset(slug: string, name: string, description: string, category: string, tags: string[], background: string, gradient: string, textColor: string, accentColor: string, fontFamily = 'Inter', tokens: VisualThemeTokens = {}): PortableTheme {
  return { schemaVersion: 1, type: 'theme', name, slug, description, category, tags, variant: 'classic', mode: 'dark', tokens: { ...presetBase, background, gradient, textColor, accentColor, fontFamily, ...tokens } };
}
export const themePresets: PortableTheme[] = [
  preset('aurora-glass', 'Aurora Glass', 'Soft aurora gradients with a glass surface.', 'glass', ['aurora', 'glass'], '#0b1730', 'linear-gradient(135deg,#49e6c1,#7c5cff)', '#f8fffe', '#49e6c1', 'Inter', { card: '#17284dcc', glassBorder: '#ffffff44', backdropBlur: '18px', buttonVariant: 'glass' }),
  preset('obsidian', 'Obsidian', 'A deep neutral theme for focused reading.', 'dark', ['dark', 'minimal'], '#070a12', 'linear-gradient(135deg,#070a12,#1c263c)', '#f8fafc', '#8da2ff', 'Inter', { buttonVariant: 'solid', shadowLarge: '0 24px 60px #00000066' }),
  preset('cyberpunk-2099', 'Cyberpunk 2099', 'Electric neon accents over a midnight grid.', 'neon', ['neon', 'cyber'], '#10051f', 'linear-gradient(135deg,#ff1493,#5b21b6)', '#fff7fe', '#00f5ff', 'Space Grotesk', { glowColor: '#00f5ff', glowIntensity: '0.8', buttonVariant: 'neon' }),
  preset('emerald-vault', 'Emerald Vault', 'Rich emerald surfaces with warm metallic accents.', 'luxury', ['emerald', 'vault'], '#061b16', 'linear-gradient(135deg,#064e3b,#10b981)', '#ecfdf5', '#fbbf24', 'Space Grotesk', { buttonVariant: 'solid', success: '#34d399' }),
  preset('crimson-vault', 'Crimson Vault', 'A dramatic crimson and charcoal composition.', 'luxury', ['crimson', 'vault'], '#210b13', 'linear-gradient(135deg,#7f1d1d,#e11d48)', '#fff1f2', '#fda4af', 'Poppins', { buttonVariant: 'gradient', danger: '#fb7185' }),
  preset('lavender-dusk', 'Lavender Dusk', 'Quiet lavender tones for reflective spaces.', 'soft', ['lavender', 'dusk'], '#171229', 'linear-gradient(135deg,#312e81,#a78bfa)', '#f5f3ff', '#c4b5fd', 'Poppins'),
  preset('arctic-glass', 'Arctic Glass', 'Cool icy surfaces with crisp contrast.', 'glass', ['arctic', 'glass'], '#071525', 'linear-gradient(135deg,#0ea5e9,#dbeafe)', '#eff6ff', '#7dd3fc', 'Inter', { card: '#153047cc', glassBorder: '#bae6fd66', buttonVariant: 'glass' }),
  preset('solar-flare', 'Solar Flare', 'Bright solar warmth with confident typography.', 'warm', ['solar', 'bright'], '#281106', 'linear-gradient(135deg,#f97316,#facc15)', '#fff7ed', '#fde047', 'Poppins'),
  preset('terminal-green', 'Terminal Green', 'Monospace-inspired green terminal aesthetic.', 'technical', ['terminal', 'green'], '#030b08', 'linear-gradient(135deg,#052e16,#14532d)', '#dcfce7', '#4ade80', 'JetBrains Mono', { headingFont: 'JetBrains Mono', bodyFont: 'JetBrains Mono', buttonVariant: 'outline', border: '#166534' }),
  preset('rose-quartz', 'Rose Quartz', 'A polished rose palette with soft edges.', 'soft', ['rose', 'quartz'], '#2a111d', 'linear-gradient(135deg,#9f1239,#fda4af)', '#fff1f2', '#f9a8d4', 'Poppins'),
  preset('paper-ink', 'Paper & Ink', 'Editorial paper tones for readable confession cards.', 'editorial', ['paper', 'ink'], '#f8fafc', 'linear-gradient(135deg,#ffffff,#e2e8f0)', '#0f172a', '#334155', 'Georgia', { card: '#ffffff', border: '#cbd5e1', buttonVariant: 'outline' }),
  preset('steel-ice', 'Steel & Ice', 'Industrial blue-gray surfaces with icy highlights.', 'industrial', ['steel', 'ice'], '#111827', 'linear-gradient(135deg,#1f2937,#64748b)', '#f1f5f9', '#bae6fd', 'Inter'),
  preset('plum-velvet', 'Plum Velvet', 'Velvety plum layers with elegant contrast.', 'luxury', ['plum', 'velvet'], '#1e102a', 'linear-gradient(135deg,#581c87,#be185d)', '#fdf4ff', '#f0abfc', 'Space Grotesk'),
  preset('blueberry-night', 'Blueberry Night', 'A calm blueberry night for late campus thoughts.', 'dark', ['blueberry', 'night'], '#0b102b', 'linear-gradient(135deg,#1e3a8a,#312e81)', '#eef2ff', '#93c5fd', 'Inter'),
];
export function validatePresets() { return themePresets.map((item) => normalizeImportedTheme(item).normalized); }
