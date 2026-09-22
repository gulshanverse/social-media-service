import type { CSSProperties } from 'react';
import type { PublicConfession } from '@ggv/types';

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
  const style: CardStyle = {
    background: theme?.gradient ?? '#151c2b',
    color: theme?.textColor ?? '#fff',
    borderRadius: theme?.radius ?? '28px',
    fontFamily: theme?.fontFamily ?? 'inherit',
    '--card-accent': theme?.accentColor ?? '#00b8ff',
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
