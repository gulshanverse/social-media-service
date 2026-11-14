import type { CSSProperties, ReactNode } from 'react';
import type { PromotionLayoutSettings, PublicHomepagePromotion, PublicPromotionTheme } from '@ggv/types';

export type HomepagePromotionBannerProps = {
  promotion: Pick<
    PublicHomepagePromotion,
    'title' | 'description' | 'badgeText' | 'desktopImageUrl' | 'mobileImageUrl' | 'imageAlt' | 'ctaLabel' | 'destinationUrl'
  >;
  theme: PublicPromotionTheme;
  layoutSettings: PromotionLayoutSettings;
  image?: string | null;
  interactiveCta?: boolean;
  className?: string;
  controls?: ReactNode;
  headingLevel?: 2 | 3;
};

function styleFor(theme: PublicPromotionTheme, layout: PromotionLayoutSettings): CSSProperties {
  const font = (value: string) => (value === 'inherit' ? theme.fontFamily : value);
  const width = { narrow: '48%', standard: '62%', wide: '78%' }[layout.contentWidth];
  const padding = { compact: 'clamp(16px, 3vw, 24px)', comfortable: 'clamp(20px, 4vw, 36px)', airy: 'clamp(26px, 5vw, 52px)' }[layout.padding];
  const gap = { compact: '8px', comfortable: '12px', airy: '17px' }[layout.spacing];
  const flexAlign = { left: 'flex-start', center: 'center', right: 'flex-end' }[layout.alignment];
  const x = { left: '0%', center: '50%', right: '100%' }[layout.horizontalPosition];
  const y = { top: '0%', center: '50%', bottom: '100%' }[layout.verticalPosition];
  const translateX = { left: '0', center: '-50%', right: '-100%' }[layout.horizontalPosition];
  const translateY = { top: '0', center: '-50%', bottom: '-100%' }[layout.verticalPosition];
  return {
    '--promotion-background': theme.background,
    '--promotion-gradient': theme.gradient,
    '--promotion-text': theme.textColor,
    '--promotion-accent': theme.accentColor,
    '--promotion-font': font(layout.bodyFont),
    '--promotion-heading-font': font(layout.headingFont),
    '--promotion-heading-size': `${layout.headingSize}rem`,
    '--promotion-description-size': `${layout.descriptionSize}rem`,
    '--promotion-heading-weight': layout.headingWeight,
    '--promotion-description-weight': layout.descriptionWeight,
    '--promotion-heading-line-height': layout.headingLineHeight,
    '--promotion-description-line-height': layout.descriptionLineHeight,
    '--promotion-copy-width': layout.mode === 'auto' ? 'min(62%, 620px)' : width,
    '--promotion-copy-x': x,
    '--promotion-copy-y': y,
    '--promotion-copy-translate-x': translateX,
    '--promotion-copy-translate-y': translateY,
    '--promotion-copy-padding': padding,
    '--promotion-copy-gap': gap,
    '--promotion-copy-flex-align': flexAlign,
    '--promotion-copy-text-align': layout.alignment,
    '--promotion-letter-spacing': layout.letterSpacing === 'tight' ? '-0.04em' : layout.letterSpacing === 'wide' ? '0.04em' : 'normal',
    '--promotion-heading-transform': layout.headingTransform,
    '--promotion-radius': theme.radius,
  } as CSSProperties;
}

export function HomepagePromotionBanner({
  promotion,
  theme,
  layoutSettings,
  image,
  interactiveCta = true,
  className = '',
  controls,
  headingLevel = 2,
}: HomepagePromotionBannerProps) {
  const artwork = image ?? promotion.desktopImageUrl ?? promotion.mobileImageUrl;
  const external = Boolean(promotion.destinationUrl?.startsWith('https://'));
  const cta = promotion.ctaLabel && promotion.destinationUrl ? (
    interactiveCta ? (
      <a className="homepage-promotion-cta" href={promotion.destinationUrl} rel={external ? 'noopener noreferrer' : undefined} aria-label={`${promotion.ctaLabel}: ${promotion.title}`}>
        {promotion.ctaLabel} <span aria-hidden="true">↗</span>
      </a>
    ) : (
      <span className="homepage-promotion-cta">{promotion.ctaLabel} ↗</span>
    )
  ) : null;
  const Heading = headingLevel === 3 ? 'h3' : 'h2';

  return (
    <div className={`homepage-promotion-card ${className}`.trim()} style={styleFor(theme, layoutSettings)}>
      <div className="homepage-promotion-media">
        {artwork && (
          <picture>
            {promotion.mobileImageUrl && <source media="(max-width: 600px)" srcSet={promotion.mobileImageUrl} />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={artwork} alt={promotion.imageAlt || promotion.title} />
          </picture>
        )}
      </div>
      <div className="homepage-promotion-shade" />
      <div className="homepage-promotion-copy">
        {promotion.badgeText && <p className="homepage-promotion-badge">{promotion.badgeText}</p>}
        <Heading>{promotion.title}</Heading>
        {promotion.description && <p className="homepage-promotion-description">{promotion.description}</p>}
        {cta}
      </div>
      {controls}
    </div>
  );
}
