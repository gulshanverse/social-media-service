export const readLiveButtonColorModes = ['solid', 'gradient', 'animated-gradient'] as const;
export type ReadLiveButtonColorMode = (typeof readLiveButtonColorModes)[number];

export const readLiveButtonDirections = [
  'to-right',
  'to-left',
  'to-bottom',
  'to-bottom-right',
  'to-top-right',
] as const;
export type ReadLiveButtonDirection = (typeof readLiveButtonDirections)[number];

export const readLiveButtonGlowIntensities = ['low', 'medium', 'high'] as const;
export type ReadLiveButtonGlowIntensity = (typeof readLiveButtonGlowIntensities)[number];

export const readLiveButtonAnimations = ['off', 'subtle', 'dynamic'] as const;
export type ReadLiveButtonAnimation = (typeof readLiveButtonAnimations)[number];

export const readLiveButtonAnimationSpeeds = ['slow', 'normal', 'fast'] as const;
export type ReadLiveButtonAnimationSpeed = (typeof readLiveButtonAnimationSpeeds)[number];

export type ReadLiveConfessionButtonConfig = {
  colorMode: ReadLiveButtonColorMode;
  colors: string[];
  gradientDirection: ReadLiveButtonDirection;
  glowEnabled: boolean;
  glowColor: string;
  glowIntensity: ReadLiveButtonGlowIntensity;
  animation: ReadLiveButtonAnimation;
  animationSpeed: ReadLiveButtonAnimationSpeed;
};

export const defaultReadLiveConfessionButton: ReadLiveConfessionButtonConfig = {
  colorMode: 'gradient',
  colors: ['#FF6B35', '#EF233C', '#FF2D75'],
  gradientDirection: 'to-right',
  glowEnabled: true,
  glowColor: '#FF2D75',
  glowIntensity: 'medium',
  animation: 'subtle',
  animationSpeed: 'normal',
};

const hexColorPattern = /^#[0-9a-f]{6}$/i;

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && hexColorPattern.test(value);
}

function oneOf<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === 'string' && values.includes(value as T) ? (value as T) : fallback;
}

export function normalizeReadLiveConfessionButton(value: unknown): ReadLiveConfessionButtonConfig {
  const input =
    value && typeof value === 'object' ? (value as Partial<ReadLiveConfessionButtonConfig>) : {};
  const colors = Array.isArray(input.colors) ? input.colors.filter(isHexColor).slice(0, 4) : [];
  const safeColors = colors.length >= 2 ? colors : defaultReadLiveConfessionButton.colors;
  return {
    colorMode: oneOf(input.colorMode, readLiveButtonColorModes, 'gradient'),
    colors: safeColors,
    gradientDirection: oneOf(input.gradientDirection, readLiveButtonDirections, 'to-right'),
    glowEnabled: typeof input.glowEnabled === 'boolean' ? input.glowEnabled : true,
    glowColor: isHexColor(input.glowColor)
      ? input.glowColor
      : defaultReadLiveConfessionButton.glowColor,
    glowIntensity: oneOf(input.glowIntensity, readLiveButtonGlowIntensities, 'medium'),
    animation: oneOf(input.animation, readLiveButtonAnimations, 'subtle'),
    animationSpeed: oneOf(input.animationSpeed, readLiveButtonAnimationSpeeds, 'normal'),
  };
}

export function readLiveConfessionButtonCssVariables(
  value: ReadLiveConfessionButtonConfig,
): Record<string, string> {
  const directions: Record<ReadLiveButtonDirection, string> = {
    'to-right': 'to right',
    'to-left': 'to left',
    'to-bottom': 'to bottom',
    'to-bottom-right': 'to bottom right',
    'to-top-right': 'to top right',
  };
  const background =
    value.colorMode === 'solid'
      ? value.colors[0]
      : `linear-gradient(${directions[value.gradientDirection]}, ${value.colors.join(', ')})`;
  const glow = value.glowEnabled
    ? value.glowIntensity === 'high'
      ? `0 0 30px ${value.glowColor}99, 0 10px 24px ${value.glowColor}66`
      : value.glowIntensity === 'low'
        ? `0 0 12px ${value.glowColor}66, 0 8px 18px ${value.glowColor}33`
        : `0 0 20px ${value.glowColor}80, 0 10px 22px ${value.glowColor}4d`
    : '0 8px 18px rgba(23, 19, 29, 0.18)';
  return {
    '--read-live-button-background': background,
    '--read-live-button-glow': glow,
  };
}

export function readLiveConfessionButtonClassName(value: ReadLiveConfessionButtonConfig): string {
  return [
    'read-live-confession-button',
    `read-live-button--${value.animation}`,
    `read-live-button--speed-${value.animationSpeed}`,
  ].join(' ');
}
