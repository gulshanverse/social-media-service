import type { CSSProperties } from 'react';
import { themeToCssVariables, type Theme } from '@ggv/themes';

const categoryLabels: Record<string, string> = {
  PARTNER: 'Looking for partner',
  GROUP: 'Looking for a group',
  FRIENDS: 'Looking for friends',
  EVENT: 'Going to an event',
  PRACTICE: 'Practice partner',
  GENERAL: 'Garba community',
};

type GarbaCardPost = {
  publicId?: string;
  category: string;
  content: string;
  eventDate?: string | null;
  location?: string | null;
  instagramHandle?: string | null;
  instagramUrl?: string | null;
  createdAt?: string;
  theme?: Theme | null;
  _count?: { comments?: number; reactions?: number };
};

type GarbaCardProps = {
  post: GarbaCardPost;
  detailed?: boolean;
  footer?: React.ReactNode;
};

function date(value?: string | null) {
  return value
    ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;
}

export function GarbaCard({ post, detailed = false, footer }: GarbaCardProps) {
  const theme = post.theme;
  const style = {
    ...(theme ? themeToCssVariables(theme) : {}),
    '--card-accent': 'var(--theme-accent, var(--garba-gold))',
    '--garba-card-text': 'var(--theme-text, var(--garba-ivory))',
    '--garba-card-gradient':
      'var(--theme-gradient, linear-gradient(145deg, rgba(36, 19, 47, 0.96), rgba(16, 18, 37, 0.93)))',
  } as CSSProperties;
  const categoryClass = post.category.toLowerCase();
  return (
    <article
      className={`garba-card garba-card--${categoryClass} ${detailed ? 'detail-card' : ''}`.trim()}
      style={style}
      data-theme-id={theme?.id}
    >
      <div className="garba-card__top">
        <span className="garba-card__badge">
          <i aria-hidden="true" />
          {categoryLabels[post.category] ?? 'Garba community'}
        </span>
        {post.createdAt && <time dateTime={post.createdAt}>{date(post.createdAt)}</time>}
      </div>
      <p className="garba-card__content">{post.content}</p>
      <div className="garba-meta">
        {date(post.eventDate) && (
          <span>
            <b aria-hidden="true">◷</b>
            {date(post.eventDate)}
          </span>
        )}
        {post.location && (
          <span>
            <b aria-hidden="true">⌖</b>
            {post.location}
          </span>
        )}
      </div>
      {post.instagramUrl && (
        <a className="garba-instagram" href={post.instagramUrl} target="_blank" rel="noreferrer">
          @{post.instagramHandle} ↗
        </a>
      )}
      {footer ?? (
        <div className="garba-card__bottom">
          <span aria-label={`${post._count?.reactions ?? 0} reactions`}>
            ♥ {post._count?.reactions ?? 0}
          </span>
          <span aria-label={`${post._count?.comments ?? 0} comments`}>
            💬 {post._count?.comments ?? 0}
          </span>
        </div>
      )}
    </article>
  );
}
