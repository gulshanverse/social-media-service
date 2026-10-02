export type CanonicalThemeTokens = {
  background: string;
  gradient: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  radius: number;
  logoVisibility: boolean;
  handleVisibility: boolean;
  layoutVariant: string;
};

export type Theme = {
  id: string;
  name: string;
  slug?: string;
  background: string;
  gradient: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  radius: string;
  borderStyle?: CanonicalThemeTokens['borderStyle'];
  logoVisibility?: boolean;
  handleVisibility?: boolean;
  layoutVariant?: string;
};

export type ThemeInput = {
  id?: string;
  name: string;
  slug?: string;
  background: string;
  gradient: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  radius: number | string;
  borderStyle?: CanonicalThemeTokens['borderStyle'];
  logoVisibility?: boolean;
  handleVisibility?: boolean;
  layoutVariant?: string;
};

export type NormalizedTheme = Omit<Theme, 'id' | 'slug' | 'radius'> &
  CanonicalThemeTokens & { id: string; slug: string };

const SAFE_CSS_TEXT = /^(?!.*(?:javascript\s*:|url\s*\(|var\s*\(|expression\s*\(|@import|<|>|[{};]))[^\r\n]*$/i;
const SAFE_FONT = /^[a-zA-Z0-9 ,.'"_-]+$/;
const SAFE_COLOR = /^(?:#[0-9a-f]{3,4}|#[0-9a-f]{6}(?:[0-9a-f]{2})?|(?:rgb|rgba|hsl|hsla)\([^\r\n;{}]+\)|[a-zA-Z]+)$/i;
const SAFE_GRADIENT = /^(?:none|(?:linear|radial|conic)-gradient\([^\r\n;{}]+\))$/i;
const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'none'] as const;
const DEFAULTS = {
  borderStyle: 'solid' as const,
  logoVisibility: true,
  handleVisibility: true,
  layoutVariant: 'classic',
};

function safeText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') throw new Error(`${field} must be a string.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || !SAFE_CSS_TEXT.test(normalized)) {
    throw new Error(`${field} contains an unsafe or invalid value.`);
  }
  return normalized;
}

function safeColor(value: unknown, field: string): string {
  const normalized = safeText(value, field, 100);
  if (!SAFE_COLOR.test(normalized)) throw new Error(`${field} must be a safe CSS color.`);
  return normalized;
}

function safeGradient(value: unknown): string {
  const normalized = safeText(value, 'gradient', 500);
  if (!SAFE_GRADIENT.test(normalized)) throw new Error('gradient must be a safe CSS gradient.');
  return normalized;
}

function normalizeRadius(value: unknown): number {
  const numeric = typeof value === 'string' ? Number.parseFloat(value.replace(/px$/i, '')) : value;
  if (typeof numeric !== 'number' || !Number.isInteger(numeric) || numeric < 0 || numeric > 100) {
    throw new Error('radius must be an integer between 0 and 100.');
  }
  return numeric;
}

export function normalizeTheme(input: ThemeInput): NormalizedTheme {
  const slug = safeText(input.slug ?? input.id, 'slug', 80);
  const name = safeText(input.name, 'name', 120);
  const fontFamily = safeText(input.fontFamily, 'fontFamily', 120);
  if (!SAFE_FONT.test(fontFamily) || /(?:url|javascript|expression|@import)/i.test(fontFamily)) {
    throw new Error('fontFamily contains an unsafe or invalid value.');
  }
  const borderStyle = input.borderStyle ?? DEFAULTS.borderStyle;
  if (!BORDER_STYLES.includes(borderStyle)) throw new Error('borderStyle is invalid.');
  if (input.logoVisibility !== undefined && typeof input.logoVisibility !== 'boolean') {
    throw new Error('logoVisibility must be a boolean.');
  }
  if (input.handleVisibility !== undefined && typeof input.handleVisibility !== 'boolean') {
    throw new Error('handleVisibility must be a boolean.');
  }
  const layoutVariant = safeText(input.layoutVariant ?? DEFAULTS.layoutVariant, 'layoutVariant', 40);
  return {
    id: input.id ?? slug,
    slug,
    name,
    background: safeColor(input.background, 'background'),
    gradient: safeGradient(input.gradient),
    textColor: safeColor(input.textColor, 'textColor'),
    accentColor: safeColor(input.accentColor, 'accentColor'),
    fontFamily,
    radius: normalizeRadius(input.radius),
    borderStyle,
    logoVisibility: input.logoVisibility ?? DEFAULTS.logoVisibility,
    handleVisibility: input.handleVisibility ?? DEFAULTS.handleVisibility,
    layoutVariant,
  };
}

export function themeToCssVariables(theme: ThemeInput): Record<string, string> {
  const normalized = normalizeTheme(theme);
  return {
    '--theme-background': normalized.background,
    '--theme-gradient': normalized.gradient,
    '--theme-text': normalized.textColor,
    '--theme-accent': normalized.accentColor,
    '--theme-font-family': normalized.fontFamily,
    '--theme-border-style': normalized.borderStyle,
    '--theme-radius': `${normalized.radius}px`,
    '--theme-logo-visibility': normalized.logoVisibility ? 'visible' : 'hidden',
    '--theme-handle-visibility': normalized.handleVisibility ? 'visible' : 'hidden',
    '--theme-layout-variant': normalized.layoutVariant,
  };
}
export const themes: Theme[] = [
  {
    id: 'ngl-classic',
    name: 'NGL Classic',
    background: '#ff2d75',
    gradient: 'linear-gradient(135deg,#ff2d75,#ff7a00)',
    textColor: '#fff',
    accentColor: '#ffd54a',
    fontFamily: 'Inter',
    radius: '28px',
  },
  {
    id: 'neon-lime',
    name: 'Neon Lime',
    background: '#22e879',
    gradient: 'linear-gradient(135deg,#22e879,#c8ff00)',
    textColor: '#070a12',
    accentColor: '#070a12',
    fontFamily: 'Inter',
    radius: '28px',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    background: '#070a12',
    gradient: 'linear-gradient(135deg,#070a12,#101c3b)',
    textColor: '#fff',
    accentColor: '#00b8ff',
    fontFamily: 'Inter',
    radius: '28px',
  },
  {
    id: 'royal',
    name: 'Royal',
    background: '#8b5cf6',
    gradient: 'linear-gradient(135deg,#8b5cf6,#ff2d75)',
    textColor: '#fff',
    accentColor: '#ffd54a',
    fontFamily: 'Space Grotesk',
    radius: '28px',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    background: '#00d9ff',
    gradient: 'linear-gradient(135deg,#00d9ff,#0066ff)',
    textColor: '#fff',
    accentColor: '#070a12',
    fontFamily: 'Inter',
    radius: '28px',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    background: '#ff7a00',
    gradient: 'linear-gradient(135deg,#ff7a00,#ff2d75)',
    textColor: '#fff',
    accentColor: '#fff',
    fontFamily: 'Poppins',
    radius: '28px',
  },
  {
    id: 'ggv-gold',
    name: 'GGV Gold',
    background: '#070a12',
    gradient: 'linear-gradient(135deg,#070a12,#6b4d00)',
    textColor: '#fff',
    accentColor: '#ffd54a',
    fontFamily: 'Space Grotesk',
    radius: '18px',
  },
  {
    id: 'campus-dark',
    name: 'Campus Dark',
    background: '#101522',
    gradient: 'linear-gradient(135deg,#101522,#243c5a)',
    textColor: '#fff',
    accentColor: '#00d9ff',
    fontFamily: 'Inter',
    radius: '18px',
  },
];
