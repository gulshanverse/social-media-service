export const PROMOTION_LEGACY_BACKGROUNDS = ['aurora', 'sunset', 'ocean', 'midnight'] as const;
export type PromotionLegacyBackground = (typeof PROMOTION_LEGACY_BACKGROUNDS)[number];

export type PromotionLayoutSettings = {
  version: 1;
  mode: 'auto' | 'manual';
  headingFont: 'inherit' | 'Inter' | 'Poppins' | 'Space Grotesk' | 'DM Sans' | 'Georgia';
  bodyFont: 'inherit' | 'Inter' | 'Poppins' | 'Space Grotesk' | 'DM Sans' | 'Georgia';
  headingSize: number;
  descriptionSize: number;
  headingWeight: 500 | 600 | 700 | 800;
  descriptionWeight: 400 | 500 | 600 | 700;
  headingLineHeight: number;
  descriptionLineHeight: number;
  letterSpacing: 'tight' | 'normal' | 'wide';
  headingTransform: 'none' | 'uppercase' | 'capitalize';
  alignment: 'left' | 'center' | 'right';
  horizontalPosition: 'left' | 'center' | 'right';
  verticalPosition: 'top' | 'center' | 'bottom';
  contentWidth: 'narrow' | 'standard' | 'wide';
  padding: 'compact' | 'comfortable' | 'airy';
  spacing: 'compact' | 'comfortable' | 'airy';
};

export type PublicPromotionTheme = {
  id: string;
  name: string;
  background: string;
  gradient: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  radius: string;
};

export type PublicHomepagePromotion = {
  id: string;
  title: string;
  description: string | null;
  badgeText: string | null;
  desktopImageUrl: string | null;
  mobileImageUrl: string | null;
  backgroundPreset: string;
  theme?: PublicPromotionTheme;
  layoutSettings?: PromotionLayoutSettings;
  imageAlt: string | null;
  ctaLabel: string | null;
  destinationUrl: string | null;
};
