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
  visualTokens: Record<string, string>;
};
export type VisualThemeTokens = Record<string, string>;

/** Optional JSON-only tokens supported by the card renderer. */
export const advancedThemeTokenKeys = [
  'cardStyle',
  'cardBackground',
  'cardBorderWidth',
  'cardBorderStyle',
  'cardBorderColor',
  'cardBorderGradient',
  'cardRadius',
  'cardPadding',
  'cardShadow',
  'cardInnerShadow',
  'cardGlowEnabled',
  'cardGlowColor',
  'cardGlowIntensity',
  'cardGlowBlur',
  'cardGlowSpread',
  'cardGlowPosition',
  'cardHoverGlowColor',
  'cardHoverScale',
  'cardHoverLift',
  'cardHoverTransition',
  'cardBackdropBlur',
  'cardGlassOpacity',
  'cardHighlightOpacity',
  'cardNoiseOpacity',
  'cardPattern',
  'cardPatternColor',
  'cardPatternOpacity',
  'cardCornerDecoration',
  'cardOverflow',
  'cardLayout',
  'cardHeaderLayout',
  'cardContentAlignment',
  'cardFooterLayout',
  'cardGap',
  'cardHeaderGap',
  'cardBodyGap',
  'cardFooterGap',
  'cardMetadataLayout',
  'cardAvatarShape',
  'cardAvatarSize',
  'cardQuoteStyle',
  'cardBadgeStyle',
  'cardDividerStyle',
  'cardMediaPosition',
  'cardMinHeight',
  'cardMaxWidth',
  'cardAspectRatio',
  'cardContentOrder',
  'headingFont',
  'bodyFont',
  'cardTitleFont',
  'cardBodyFont',
  'cardMetadataFont',
  'cardAuthorFont',
  'cardQuoteFont',
  'buttonFont',
  'badgeFont',
  'decorativeFont',
  'cardTitleFontSize',
  'cardTitleWeight',
  'cardTitleFontStyle',
  'cardTitleLineHeight',
  'cardTitleLetterSpacing',
  'cardTitleTextAlign',
  'cardTitleTextTransform',
  'cardTitleTextDecoration',
  'cardTitleTextShadow',
  'cardTitleColor',
  'cardTitleMaxLines',
  'cardTitleOverflow',
  'cardBodyFontSize',
  'cardBodyWeight',
  'cardBodyFontStyle',
  'cardBodyLineHeight',
  'cardBodyLetterSpacing',
  'cardBodyTextAlign',
  'cardBodyTextTransform',
  'cardBodyTextDecoration',
  'cardBodyTextShadow',
  'cardBodyColor',
  'cardBodyMaxLines',
  'cardBodyOverflow',
  'cardMetadataFontSize',
  'cardMetadataWeight',
  'cardMetadataLineHeight',
  'cardMetadataLetterSpacing',
  'cardMetadataTextAlign',
  'cardMetadataTextTransform',
  'cardMetadataColor',
  'cardAuthorColor',
  'cardQuoteColor',
  'cardQuoteTextShadow',
  'buttonShape',
  'buttonBorder',
  'buttonShadow',
  'buttonGlow',
  'buttonHoverBackground',
  'buttonHoverText',
  'buttonActiveBackground',
  'buttonActiveText',
  'buttonTransition',
  'badgeShape',
  'badgeBackground',
  'badgeText',
  'likeActionStyle',
  'replyActionStyle',
  'focusColor',
  'reducedMotion',
  'decorativeColor',
  'cardTitle',
  'cardBody',
] as const;
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
  tokens?: VisualThemeTokens;
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
  tokens?: VisualThemeTokens;
};
export type NormalizedTheme = Omit<Theme, 'id' | 'slug' | 'radius'> &
  CanonicalThemeTokens & { id: string; slug: string };
const SAFE_CSS_TEXT =
  /^(?!.*(?:javascript\s*:|url\s*\(|var\s*\(|expression\s*\(|@import|<|>|[{};]))[^\r\n]*$/i;
const SAFE_FONT = /^[a-zA-Z0-9 ,.'"_-]+$/;
const SAFE_COLOR =
  /^(?:#[0-9a-f]{3,4}|#[0-9a-f]{6}(?:[0-9a-f]{2})?|(?:rgb|rgba|hsl|hsla)\([^\r\n;{}]+\)|[a-zA-Z]+)$/i;
const SAFE_GRADIENT = /^(?:none|(?:linear|radial|conic)-gradient\([^\r\n;{}]+\))$/i;
const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'none'] as const;
const TOKEN_NAME = /^[a-z][a-zA-Z0-9]*$/;
const TOKEN_KEYS = new Set([
  'headingFont',
  'bodyFont',
  'monospaceFont',
  'headingWeight',
  'bodyWeight',
  'buttonWeight',
  'letterSpacing',
  'headingLetterSpacing',
  'bodyLetterSpacing',
  'lineHeight',
  'headingLineHeight',
  'bodyLineHeight',
  'primaryText',
  'secondaryText',
  'mutedText',
  'disabledText',
  'headingText',
  'linkText',
  'linkHover',
  'placeholderText',
  'accentHover',
  'accentActive',
  'accentSoft',
  'accentContrast',
  'secondaryAccent',
  'surface',
  'surfaceHover',
  'surfaceActive',
  'surfaceElevated',
  'card',
  'cardHover',
  'input',
  'inputHover',
  'inputFocus',
  'popover',
  'modal',
  'overlay',
  'border',
  'borderHover',
  'borderActive',
  'divider',
  'focusRing',
  'glassBorder',
  'buttonBackground',
  'buttonText',
  'buttonHover',
  'buttonActive',
  'buttonDisabled',
  'buttonBorder',
  'buttonShadow',
  'buttonVariant',
  'success',
  'successSoft',
  'warning',
  'warningSoft',
  'danger',
  'dangerSoft',
  'info',
  'infoSoft',
  'shadow',
  'shadowSmall',
  'shadowMedium',
  'shadowLarge',
  'glow',
  'glowColor',
  'glowIntensity',
  'glowBlur',
  'blur',
  'backdropBlur',
  'glassOpacity',
  'noiseOpacity',
  'highlightOpacity',
  'cardRadius',
  'buttonRadius',
  'inputRadius',
  'badgeRadius',
  'modalRadius',
  'backgroundImage',
  'gradientType',
  'gradientAngle',
  'gradientOpacity',
  ...advancedThemeTokenKeys,
]);
const ENUM_TOKENS: Record<string, readonly string[]> = {
  cardStyle: [
    'standard',
    'glass',
    'outlined',
    'gradient',
    'neumorphic',
    'editorial',
    'brutalist',
    'holographic',
  ],
  cardBorderStyle: ['solid', 'dashed', 'dotted', 'double', 'gradient'],
  cardGlowPosition: ['outer', 'inner', 'both'],
  cardPattern: ['none', 'dots', 'grid', 'lines', 'stars', 'grain'],
  cardCornerDecoration: ['none', 'brackets', 'stars', 'circles', 'ornaments'],
  cardOverflow: ['hidden', 'visible'],
  cardLayout: [
    'classic',
    'horizontal',
    'vertical',
    'magazine',
    'compact',
    'featured',
    'quote',
    'profile',
    'minimal',
  ],
  cardHeaderLayout: ['inline', 'stacked', 'split', 'centered'],
  cardContentAlignment: ['left', 'center', 'right'],
  cardFooterLayout: ['inline', 'split', 'stacked', 'centered'],
  cardMetadataLayout: ['inline', 'stacked', 'badges'],
  cardAvatarShape: ['circle', 'rounded', 'square', 'hidden'],
  cardQuoteStyle: ['none', 'quotation-marks', 'quotation-border', 'oversized', 'handwritten'],
  cardBadgeStyle: ['pill', 'outlined', 'solid', 'minimal'],
  cardDividerStyle: ['none', 'solid', 'dashed', 'gradient'],
  cardMediaPosition: ['top', 'bottom', 'left', 'right', 'background', 'none'],
  cardTitleFontStyle: ['normal', 'italic', 'oblique'],
  cardBodyFontStyle: ['normal', 'italic', 'oblique'],
  cardTitleTextAlign: ['left', 'center', 'right', 'justify'],
  cardBodyTextAlign: ['left', 'center', 'right', 'justify'],
  cardTitleTextTransform: ['none', 'uppercase', 'lowercase', 'capitalize'],
  cardBodyTextTransform: ['none', 'uppercase', 'lowercase', 'capitalize'],
  cardTitleOverflow: ['visible', 'hidden', 'ellipsis'],
  cardBodyOverflow: ['visible', 'hidden', 'ellipsis'],
  buttonShape: ['pill', 'rounded', 'square'],
  badgeShape: ['pill', 'rounded', 'square'],
  likeActionStyle: ['text', 'icon', 'button', 'minimal'],
  replyActionStyle: ['text', 'icon', 'button', 'minimal'],
  reducedMotion: ['respect', 'always', 'never'],
};
const COLOR_TOKENS = new Set([
  'cardBorderColor',
  'cardGlowColor',
  'cardHoverGlowColor',
  'cardPatternColor',
  'cardTitleColor',
  'cardBodyColor',
  'cardMetadataColor',
  'cardAuthorColor',
  'cardQuoteColor',
  'buttonHoverBackground',
  'buttonHoverText',
  'buttonActiveBackground',
  'buttonActiveText',
  'badgeBackground',
  'badgeText',
  'focusColor',
  'decorativeColor',
]);
const GRADIENT_TOKENS = new Set(['cardBackground', 'cardBorderGradient']);
const BOOLEAN_TOKENS = new Set(['cardGlowEnabled']);
const DEFAULTS = {
  borderStyle: 'solid' as const,
  logoVisibility: true,
  handleVisibility: true,
  layoutVariant: 'classic',
};
function safeText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') throw new Error(`${field} must be a string.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || !SAFE_CSS_TEXT.test(normalized))
    throw new Error(`${field} contains an unsafe or invalid value.`);
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
  if (typeof numeric !== 'number' || !Number.isInteger(numeric) || numeric < 0 || numeric > 100)
    throw new Error('radius must be an integer between 0 and 100.');
  return numeric;
}
function normalizeVisualTokens(input: unknown): VisualThemeTokens {
  if (input === undefined) return {};
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('tokens must be an object.');
  const output: VisualThemeTokens = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!TOKEN_NAME.test(key) || !TOKEN_KEYS.has(key))
      throw new Error(`Unsupported visual token: ${key}.`);
    if (typeof value !== 'string' || value.length > 300 || !SAFE_CSS_TEXT.test(value.trim()))
      throw new Error(`${key} contains an unsafe or invalid value.`);
    const normalized = value.trim();
    const allowed = ENUM_TOKENS[key];
    if (allowed && !allowed.includes(normalized))
      throw new Error(`${key} must be one of: ${allowed.join(', ')}.`);
    if (BOOLEAN_TOKENS.has(key) && !['true', 'false'].includes(normalized))
      throw new Error(`${key} must be true or false.`);
    if (COLOR_TOKENS.has(key)) safeColor(normalized, key);
    if (GRADIENT_TOKENS.has(key) && normalized !== 'transparent') {
      const isColor = SAFE_COLOR.test(normalized);
      const isGradient = SAFE_GRADIENT.test(normalized);
      if (!isColor && !isGradient) throw new Error(`${key} must be a safe CSS color or gradient.`);
    }
    output[key] = normalized;
  }
  return output;
}
export function normalizeTheme(input: ThemeInput): NormalizedTheme {
  const slug = safeText(input.slug ?? input.id, 'slug', 80);
  const name = safeText(input.name, 'name', 120);
  const fontFamily = safeText(input.fontFamily, 'fontFamily', 120);
  if (!SAFE_FONT.test(fontFamily) || /(?:url|javascript|expression|@import)/i.test(fontFamily))
    throw new Error('fontFamily contains an unsafe or invalid value.');
  const borderStyle = input.borderStyle ?? DEFAULTS.borderStyle;
  if (!BORDER_STYLES.includes(borderStyle)) throw new Error('borderStyle is invalid.');
  if (input.logoVisibility !== undefined && typeof input.logoVisibility !== 'boolean')
    throw new Error('logoVisibility must be a boolean.');
  if (input.handleVisibility !== undefined && typeof input.handleVisibility !== 'boolean')
    throw new Error('handleVisibility must be a boolean.');
  const layoutVariant = safeText(
    input.layoutVariant ?? DEFAULTS.layoutVariant,
    'layoutVariant',
    40,
  );
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
    visualTokens: normalizeVisualTokens(
      input.tokens ?? (input as ThemeInput & { visualTokens?: VisualThemeTokens }).visualTokens,
    ),
  };
}
function tokenVariableName(key: string) {
  return `--theme-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
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
    ...Object.fromEntries(
      Object.entries(normalized.visualTokens).map(([key, value]) => [
        tokenVariableName(key),
        value,
      ]),
    ),
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

export * from './portable';
export * from './wcag';
export * from './garba';
