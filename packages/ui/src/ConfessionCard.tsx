import type { CSSProperties } from 'react';
import type { PublicConfession } from '@ggv/types';
import { themeToCssVariables } from '@ggv/themes';

const categoryNames: Record<string, string> = {
  COLLEGE_LIFE: 'College Life',
  CRUSH: 'Crush',
  RELATIONSHIP: 'Relationship',
  FRIENDSHIP: 'Friendship',
  FUNNY: 'Funny',
  ADVICE: 'Advice',
  APPRECIATION: 'Appreciation',
  RANT: 'Rant',
  OTHER: 'Other',
};

type CardProps = {
  confession: PublicConfession;
  detailed?: boolean;
  display?: { cardTextSize: number; previewLines: number };
  className?: string;
};

type CardStyle = CSSProperties & {
  '--card-accent'?: string;
  '--card-text-size'?: string;
  '--preview-lines'?: number;
};

export function ConfessionCard({
  confession,
  detailed = false,
  display,
  className = '',
}: CardProps) {
  const theme = confession.theme;
  const themeVariables = theme ? themeToCssVariables(theme) : {};
  const style: CardStyle = {
    ...themeVariables,
    background: 'var(--theme-gradient, #151c2b)',
    color: 'var(--theme-text, #fff)',
    borderRadius: 'var(--theme-radius, 28px)',
    borderStyle: 'var(--theme-border-style, solid)' as CSSProperties['borderStyle'],
    fontFamily: 'var(--theme-font-family, inherit)',
    '--card-accent': 'var(--theme-accent, #00b8ff)',
    '--card-text-size': `${display?.cardTextSize ?? 16}px`,
    '--preview-lines': display?.previewLines ?? 5,
  };

  return (
    <article
      className={`confession-card ${detailed ? 'confession-card--detailed' : ''} ${className}`.trim()}
      style={style}
    >
      <div className="confession-card__top">
        <span className="confession-card__brand">♛ COLLEGE CONFESSION</span>
        <span>ANONYMOUS</span>
      </div>
      <p className="confession-card__content">“{confession.content}”</p>
      <div className="confession-card__bottom">
        <span className="confession-card__category">
          {confession.category ? categoryNames[confession.category] : 'Campus thoughts'}
        </span>
        <span>{new Date(confession.publishedAt).toLocaleDateString()}</span>
      </div>
    </article>
  );
}
