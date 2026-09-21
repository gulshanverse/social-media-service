import Link from 'next/link';
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

export function ConfessionCard({
  confession,
  detailed = false,
}: {
  confession: PublicConfession;
  detailed?: boolean;
}) {
  const theme = confession.theme;
  const content = (
    <article
      className={`confession-card ${detailed ? 'confession-card--detailed' : ''}`}
      style={{
        background: theme?.gradient ?? '#151c2b',
        color: theme?.textColor ?? '#fff',
        borderRadius: theme?.radius ?? '28px',
      }}
    >
      <div className="confession-card__top">
        <span>♛ COLLEGE CONFESSION</span>
        <span>ANONYMOUS</span>
      </div>
      <p className="confession-card__content">“{confession.content}”</p>
      <div className="confession-card__bottom">
        <span>{confession.category ? categoryNames[confession.category] : 'Campus thoughts'}</span>
        <span>{new Date(confession.publishedAt).toLocaleDateString()}</span>
      </div>
    </article>
  );
  return detailed ? (
    content
  ) : (
    <Link
      href={`/confessions/${confession.publicId}`}
      aria-label={`Read confession ${confession.publicId}`}
    >
      {content}
    </Link>
  );
}
